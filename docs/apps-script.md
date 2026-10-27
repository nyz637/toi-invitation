# Подтверждение сохранения через Google Apps Script

Прямой `fetch` на Google Forms в режиме `no-cors` даёт непрозрачный ответ. Это совместимо с GitHub Pages, но не позволяет честно открыть экран успешного сохранения. Сетевая ошибка также не доказывает, что сервер ничего не записал.

Вариант без изменения дизайна: **GitHub Pages → HTTPS-прокси с CORS → Google Apps Script → Google Forms**. Прокси необходим: обычный Apps Script `doPost` с JSON сам по себе не обеспечивает нужный CORS для внешней страницы. Применять `no-cors` к Apps Script и объявлять успех нельзя.

## Настройка владельцем

1. В редакторе своей Google Form откройте Apps Script. В настройках скрипта добавьте Script Properties: `FORM_ID` — **редакторский** ID из `/forms/d/…/edit` (это не публичный ID `1FAIp…`); `PROXY_TOKEN` — длинная случайная строка, доступная только Apps Script и вашему серверному прокси.
2. Добавьте приведённый ниже `doPost`. Числа в `getItemById` — реальные **ID вопросов** из опубликованной структуры, а не `entry ID` из клиентской конфигурации.
3. Разверните скрипт как Web app: выполнение от имени владельца, доступ для вызова прокси. Разрешите доступ к форме. Сохраните реальный URL `/exec` только на сервере прокси.
4. Настройте HTTPS-прокси (Cloudflare Worker, Vercel Function или другой сервер). Он принимает POST JSON с `name`, `attendance`, `wish`; добавляет `token` на сервере и передаёт в Apps Script; следует HTTP-редиректам и читает JSON. Возвращает `{"ok":true}` клиенту **только** если скрипт подтвердил сохранение и вернул ID ответа. Иначе возвращает ошибку. Не добавляйте секрет в клиентский проект.
5. Прокси должен отвечать на OPTIONS и POST с CORS для точного origin сайта (`https://ваш-логин.github.io`, без пути репозитория), разрешать `Content-Type` и возвращать `Vary: Origin`. Проверяйте поля, ограничьте частоту запросов. Настройте срок ожидания прокси меньше 20 секунд — это лимит клиента. Не повторяйте POST автоматически; для повторов после тайм-аута сначала добавьте серверную идемпотентность.
6. В `src/config/forms.js` смените `mode` на `verified`, а `verifiedEndpoint` — на **реальный URL прокси**, не Apps Script. Пересоберите сайт. Экран благодарности уже реализован и откроется после `ok: true`.

Ни скрипт, ни прокси автоматически не развёрнуты: нужны права владельца Google Form и выбранного сервера. Ниже — код для ручной настройки, не повод отправлять тест без разрешения.

```javascript
function doPost(e) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const expectedToken = properties.getProperty('PROXY_TOKEN');
    const formId = properties.getProperty('FORM_ID');
    if (!expectedToken || !formId) throw new Error('Not configured');
    const data = JSON.parse(e.postData.contents);
    if (data.token !== expectedToken) throw new Error('Unauthorized');
    if (typeof data.name !== 'string' || typeof data.attendance !== 'string' ||
        (data.wish !== undefined && typeof data.wish !== 'string')) {
      throw new Error('Invalid fields');
    }
    const name = data.name.trim();
    const wish = (data.wish || '').trim();
    if (!name || name.length > 120 || wish.length > 2000 ||
        !['Қатысамын', 'Қатыса алмаймын'].includes(data.attendance)) {
      throw new Error('Invalid fields');
    }
    const form = FormApp.openById(formId);
    if (!form.isAcceptingResponses()) throw new Error('Form closed');
    let response = form.createResponse()
      .withItemResponse(form.getItemById(1561377420).asTextItem().createResponse(name))
      .withItemResponse(form.getItemById(1490426158).asMultipleChoiceItem().createResponse(data.attendance));
    if (wish) response = response.withItemResponse(
      form.getItemById(722962688).asTextItem().createResponse(wish)
    );
    const saved = response.submit();
    const id = saved.getId();
    if (!id) throw new Error('Save not confirmed');
    return ContentService.createTextOutput(JSON.stringify({ ok: true, responseId: id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Do not disclose guest data, tokens or internal errors to visitors.
    return ContentService.createTextOutput(JSON.stringify({ ok: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Официальная документация: [FormResponse.submit()](https://developers.google.com/apps-script/reference/forms/form-response#submit()), [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [Content Service и редиректы](https://developers.google.com/apps-script/guides/content).
