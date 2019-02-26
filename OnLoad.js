//carica la pagina index.html
function doGet(e) {
    return HtmlService.createTemplateFromFile('index')
        .evaluate();
}

//inclusione file Stylesheet in html
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}