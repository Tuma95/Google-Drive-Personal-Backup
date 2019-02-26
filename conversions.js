function convert(documentId) {
    var fl = DriveApp.getFileById(documentId);
    var mime = fl.getMimeType();
    switch (mime) {

        case MimeType.GOOGLE_DOCS:
            var blob = getBlob(documentId, MimeType.MICROSOFT_WORD)
                .setName(fl.getName() + '.docx');
            break;

        case MimeType.GOOGLE_SHEETS:
            var blob = getBlob(documentId, MimeType.MICROSOFT_EXCEL)
                .setName(fl.getName() + '.xlsx');
            break;

        case MimeType.GOOGLE_SLIDES:
            var blob = getBlob(documentId, MimeType.MICROSOFT_POWERPOINT)
                .setName(fl.getName() + '.pptx');
            break;

        case MimeType.GOOGLE_DRAWINGS:
            var blob = getBlob(documentId, MimeType.JPEG)
                .setName(fl.getName() + '.jpeg');
            break;

        case MimeType.GOOGLE_FORMS:
            var blob = UrlFetchApp.fetch(DriveApp.getFileById(documentId).getUrl())
                .getAs(MimeType.HTML).setName(fl.getName() + '.html');
            break;

        case 'application/vnd.google-apps.map':
            var blob = UrlFetchApp.fetch(DriveApp.getFileById(documentId).getUrl())
                .getAs(MimeType.HTML).setName(fl.getName() + '.html');
            break;

        case MimeType.GOOGLE_SITES:
            var blob = UrlFetchApp.fetch(DriveApp.getFileById(documentId).getUrl())
                .getAs(MimeType.HTML).setName(fl.getName() + '.html');
            break;

        case 'application/vnd.google-apps.script':
            var blob = UrlFetchApp.fetch(DriveApp.getFileById(documentId).getUrl())
                .getAs(MimeType.PLAIN_TEXT).setName(fl.getName() + '.json');
            break;

        default:
            var blob = DriveApp.getFileById(documentId).getBlob();
            break;
    }

    return blob;
}

function getBlob(documentId, type) {
    var file = Drive.Files.get(documentId);
    var url = file.exportLinks[type];
    var oauthToken = ScriptApp.getOAuthToken();
    var response = UrlFetchApp.fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + oauthToken
        }
    });
    return response.getBlob();
}