var zip = []; //array di file che apparterranno ad un pacchetto zip
var files = []; //i file del drive dell'utente
var folders = [];
var folderSize = 0; //dimensione della cartella da comprimere
var selectedAllItems = false;
var currenFolder = "root";
var downloads = []; //array dei download effettuati nella sessione
var contacts = []; //array con i contatti dell'utente
var fileReady = []; //array di pacchetti zip pronti per essere scaricati
var idDownload = 0; //id di un download coincide con la posizione dell'elemento nell'array downloads
var activeList; //indica la lista che sta visualizzando l'utente, o i file, o i download o i contatti
var queue = []; //array per gestire i download in coda
var toGo = { //gestisce la concorrenza, quando un download finisce ne avvia un altro
    aInternal: true,
    aListener: function(val) {},
    set a(val) {
        this.aInternal = val;
        this.aListener(val);
    },
    get a() {
        return this.aInternal;
    },
    registerListener: function(listener) {
        this.aListener = listener;
    }
}

//al cambio della variabile a di toGo si avvia lo script, avvia un download in coda, in caso di download fallito segnala il download fallito e continua  
toGo.registerListener(function(val) {
    if (toGo.a == true && queue.length != 0) {
        var obj = queue.shift();
        downloadFrom(obj.id);
        setTimeout(function() {
            if (obj.status == "download in corso") {
                obj.status = "download non riuscito";
                updateDownoads();
                toGo.a = true;
            }
        }, 650000);
    }
});



function findItemById(arr, id) {
    for (item of arr) {
        if (id === item.id) return arr.indexOf(item);
    }
    return -1;
}


//al caricamento del documento HTML faccio una richiesta a google script per avere i file del drive e contatti dell'utente
$(function() {
    $(".download-click").hide();
    $("#my-downloads").hide();
    $("#my-contacts").hide();
    $("#zip-info").hide();
    activeList = "files";
    var runner = google.script.run.withFailureHandler(onFailure);
    runner.withSuccessHandler(onSuccess).getFiles();
});

//ricerca dinamica da tastiera
$(function() {
    var text;
    var searchedList = [];
    $("#search-bar").keyup(function() {
        text = $("#search-bar").val();
        if (activeList == "files") $("#files-table-body").empty();
        else if (activeList == "contacts") $("#contacts").empty();
        else $("#my-downloads").empty();

        if (text) {
            //caso file
            if (activeList == "files") {
                for (item of files) {
                    if (item.name.includes(text)) searchedList.push(item);
                }
                for (item of folders) {
                    if (item.name.includes(text)) searchedList.push(item);
                }
                populateFilesAll(searchedList);
                populateFoldersAll(searchedList);
            }
            //caso contacts
            else if (activeList == "contacts") {
                for (item of contacts) {
                    if (item.mail.includes(text)) searchedList.push(item);
                }
                populateContacts(searchedList);
            }
            //caso downloads
            else {
                for (item of downloads) {
                    if (item.name.includes(text)) searchedList.push(item);
                }
                populateDownload(searchedList);
            }
        } else {
            if (activeList == "files") {
                populateFiles(files, "Il mio Drive");
                populateFolders(folders, "Il mio Drive");
            } else if (activeList == "contacts") populateContacts(contacts);
            else populateDownload(downloads);
        }

        searchedList = [];
    });
});

//recupero file del drive e contatti con successo
//data è un array di oggetti con id, nome e dimensione del file
function onSuccess(data) {
    var data = JSON.parse(data);
    console.log(data);
    for (item of data.array) {
        if (item.size < 0) data.array.splice(indexOf(item), 1);
    }
    $(".loader").hide();
    $("#profile").html(data.user);
    files = data.array;
    contacts = data.contacts;
    folders = data.folders;
    if (data.array.length != 0) {
        populateFiles(files, "Il mio Drive");
    }
    if (contacts.length != 0) {
        populateContacts(contacts);
    }
    if (folders.length != 0) {
        populateFolders(folders, "Il mio Drive");
    }
}

function populateContacts(contacts) {
    for (item of contacts) {
        var listItem = $("<tr></tr>").addClass("animate-bottom file-item").attr({ id: item.id, onClick: "selected(id)" });
        var ic = $("<td></td>").addClass("text-left");
        var contactLogo = $("<i></i>").addClass("fa fa-user-circle-o").css("color", "blue");
        $(ic).append(contactLogo);
        $(listItem).append(ic);
        if (item.mail != null) $(listItem).append("<td>" + item.mail + "</td>");
        else $(listItem).append("<td> - </td>");
        if (item.name) $(listItem).append("<td>" + item.name + "</td>");
        else $(listItem).append("<td> - </td>");
        if (item.nickName) $(listItem).append("<td>" + item.nickName + "</td>");
        else $(listItem).append("<td> - </td>");
        if (item.cel) $(listItem).append("<td>" + item.cel + "</td>");
        else $(listItem).append("<td> - </td>");
        $("#contacts").append(listItem);
    }
}

function populateFiles(files, folder) {
    for (item of files) {
        if (item.parent.length == 0 || item.parent[0] == folder) {
            var listItem = $("<tr></tr>").addClass("animate-bottom file-item").attr({ id: item.id, onClick: "selected(id)" });
            for (element in zip) {
                if (zip[element].name == item.name) $(listItem).addClass("selected");
            }
            var ic = $("<td></td>");
            $(ic).append(getTypeIcon(item.mimeType));
            $(listItem).append(ic);
            $(listItem).append("<td>" + item.name + "</td>");
            if (getMb(item.size / 1024 / 1024, 2) != 0) $(listItem).append("<td>" + getMb(item.size / 1024 / 1024, 2) + " Mb</td>");
            else $(listItem).append("<td> - </td>");
            $(listItem).append("<td>" + item.owner + "</td>");
            $(listItem).append("<td>" + dateParser(item.dateCreated) + "</td>");
            $("#files-table-body").append(listItem);
        }
    }
}

function populateFilesAll(files) {
    for (item of files) {
        var listItem = $("<tr></tr>").addClass("animate-bottom file-item").attr({ id: item.id, onClick: "selected(id)" });
        for (element in zip) {
            if (zip[element].name == item.name) $(listItem).addClass("selected");
        }
        var ic = $("<td></td>");
        $(ic).append(getTypeIcon(item.mimeType || "folder"));
        $(listItem).append(ic);
        $(listItem).append("<td>" + item.name + "</td>");
        if (getMb(item.size / 1024 / 1024, 2) != 0) $(listItem).append("<td>" + getMb(item.size / 1024 / 1024, 2) + " Mb</td>");
        else $(listItem).append("<td> - </td>");
        $(listItem).append("<td>" + item.owner + "</td>");
        $(listItem).append("<td>" + dateParser(item.dateCreated) + "</td>");
        $("#files-table-body").append(listItem);
    }
}

function populateFoldersAll(fold) {
    for (item of fold) {
        var listItem = $("<tr></tr>").addClass("animate-bottom file-item").attr({ id: item.name, onClick: "openFolder(id)" });
        var ic = $("<td></td>");
        $(ic).append(getTypeIcon("folder"));
        $(listItem).append(ic);
        $(listItem).append("<td>" + item.name + "</td>");
        $(listItem).append("<td> - </td>");
        $(listItem).append("<td>" + item.owner + "</td>");
        $(listItem).append("<td>" + dateParser(item.dateCreated) + "</td>");
        $("#files-table-body").append(listItem);
    }
}

function downloadFolder() {
    var zipItem = {
        id: idDownload,
        name: currentFolder,
        files: "null",
        status: "download in corso"
    }
    toGo.a = false;
    idDownload++;
    downloads.push(zipItem);
    var runner = google.script.run;
    runner.withFailureHandler(failure);
    runner.withSuccessHandler(success).downloadFolder(zipItem);
    insertDownload(zipItem);
    showDownloads();
    showSnackBar("download di " + currentFolder + " in corso");
    $("#current-folder").empty();
    zip = [];
    $(".file-item").removeClass("selected");
    $("#file-counter").empty();
    $("#file-size").empty();
}



function populateFolders(fold, folder) {
    for (item of fold) {
        console.log(item.parents[0]);
        if (item.parents.length == 0 || item.parents[0] == folder) {
            var listItem = $("<tr></tr>").addClass("animate-bottom file-item").attr({ id: item.name, onClick: "openFolder(id)" });
            var ic = $("<td></td>");
            $(ic).append(getTypeIcon("folder"));
            $(listItem).append(ic);
            $(listItem).append("<td>" + item.name + "</td>");
            $(listItem).append("<td> - </td>");
            $(listItem).append("<td>" + item.owner + "</td>");
            $(listItem).append("<td>" + dateParser(item.dateCreated) + "</td>");
            $("#files-table-body").append(listItem);
        }
    }
}

function populateDownload(download) {
    for (item of download) {
        insertDownload(item);
    }
}

function openFolder(name) {
    console.log(name);
    var fil = [];
    var fol = [];
    currentFolder = name;
    $("#files-table-body").empty();
    $("#folder").html("<i class='fa fa-folder menu-icon'></i> scarica " + currentFolder);
    for (item of files) {
        if (item.parent[0] == name) fil.push(item);
    }
    for (item of folders) {
        if (item.parents[0] == name) fol.push(item);
    }
    var title = $("#title").html().split(" / ");
    title.push("<span id='" + name + "' onClick='openFolder(id)'>" + name + "</span>");
    var titleStr = " ";
    for (item of title) {
        if (!item.includes(name)) titleStr += item + " / ";
        else {
            titleStr += item;
            break;
        }
    }
    $("#title").html(titleStr);
    if (name == "Il mio Drive") {
        populateFiles(fil, "Il mio Drive");
        populateFolders(fol, "Il mio Drive");
    } else {
        populateFiles(fil, name);
        populateFolders(fol, name);
    }
}

function dateParser(date) {
    const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
        "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];
    var d = new Date(date);
    return d.getDate() + " " + monthNames[d.getMonth()] + " " + d.getFullYear();
}

//in base al tipo del file restituisce un icona
function getTypeIcon(mimeType) {
    var icon = $("<i></i>");
    if (mimeType == "folder") $(icon).addClass("fa fa-folder").css("color", "black");
    else if (mimeType == "application/zip" || mimeType == "application/rar" ||
        mimeType == "application/octet-stream") icon.addClass("fa fa-file-archive-o").css("color", "purple");
    else if (mimeType.split("/")[0] == "image" || mimeType == "application/vnd.google-apps.drawing" ||
        mimeType == "application/vnd.google-apps.photo") $(icon).addClass("fa fa-file-image-o").css("color", "red");
    else if (mimeType == "text/plain") $(icon).addClass("fa fa-file-text-o").css("color", "black");
    else if (mimeType.split("/")[1] == "pdf") $(icon).addClass("fa fa-file-pdf-o").css("color", "red");
    else if (mimeType.split("/")[0] == "audio") $(icon).addClass("fa fa-file-audio-o").css("color", "blue");
    else if (mimeType.split("/")[0] == "video") $(icon).addClass("fa fa-file-video-o").css("color", "blue");
    else if (mimeType.split("/")[1].includes("script")) $(icon).addClass("fa fa-file-code-o").css("color", "grey");
    else if (mimeType == "application/vnd.google-apps.document" ||
        mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType == "application/msword") $(icon).addClass("fa fa-file-word-o").css("color", "blue");
    else if (mimeType == "application/vnd.google-apps.spreadsheet" ||
        mimeType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimeType == "application/vnd.ms-excel") $(icon).addClass("fa fa-file-excel-o").css("color", "green");
    else if (mimeType == "application/vnd.google-apps.presentation" ||
        mimeType == "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        mimeType == "application/vnd.ms-powerpoint") $(icon).addClass("fa fa-file-powerpoint-o").css("color", "orange");
    else if (mimeType == "application/vnd.google-apps.map") $(icon).addClass("fa fa-file-text-o").css("color", "red");
    else if (mimeType == "application/vnd.microsoft.portable-executable") $icon.addClass("fa fa-file").css("color", "grey");
    else if (mimeType == "application/vnd.google-apps.form" || mimeType == "application/vnd.google-apps.site") $(icon).addClass("fa fa-file-text-o").css("color", "purple");
    else icon.addClass("fa fa-file-o").css("color", "blue");

    return icon;
}

//fallimento di una richiesta a google
function onFailure(data) {
    alert(data);
}

//download contatti
function downloadContacts() {
    var doc = new jsPDF();
    var elementHandler = {
        '#ignorePDF': function(element, renderer) {
            return true;
        }
    };
    var source = document.getElementById("contacts");
    doc.fromHTML(
        source,
        15,
        15, {
            'width': 180,
            'elementHandlers': elementHandler
        });

    doc.save("contacts.pdf");
}

//selezione del file cliccato
function selected(id) {
    if (!$('#' + id).hasClass("selected")) {
        var itm;
        for (item of files) {
            if (item.id === id) {
                itm = item;
                break;
            }
        }
        if (itm.size < 52428800) {
            $('#' + id).addClass("selected");
            zip.push(itm);
            folderSize += item.size;
            $(".download-click").show();
        } else showSnackBar("il file è troppo pesante, non è consentito trasferire file più grandi di 50Mb");
    } else {
        $('#' + id).removeClass("selected");
        var index = zip.indexOf(id)
        zip.splice(index, 1);
        if (zip.length == 0) {
            $(".download-click").hide();
        }
        folderSize -= item.size;
    }
    $("#current-folder").empty();
    for (item of zip) {
        $("#current-folder").append("<li class='list-group-item'>" + item.name + "</li>");
    }
    $("#file-counter").text("file totali: " + zip.length);
    $("#file-size").text("dimensione: " + getMb(folderSize / 1024 / 1024, 2) + "Mb");
}

function getMb(value, digit) {
    digit++;
    value = value || 0;
    value = value.toString();
    if (value.indexOf(".") > 0) {
        value = value.substring(0, value.indexOf(".") + digit);
    }
    value = parseFloat(value);
    return value;
}

function dwFiles() {
    var conf = confirm('vuoi scaricare i file selezionati?');
    if (conf == true) {
        download();
    } else {}
}

function download() {
    if (toGo.a == true) {
        if (zip.length != 0) {
            var zipItem = {
                id: idDownload,
                name: $("#folder-name").val(),
                files: zip,
                status: "download in corso"
            }
            toGo.a = false;
            idDownload++;
            downloads.push(zipItem);
            var runner = google.script.run;
            runner.withFailureHandler(failure);
            runner.withSuccessHandler(success).downloadFiles(zipItem);
            insertDownload(zipItem);
            showDownloads();
            showSnackBar("download di " + zipItem.name + " in corso");
            $("#current-folder").empty();
            zip = [];
            $(".file-item").removeClass("selected");
            $("#file-counter").empty();
            $("#file-size").empty();
        } else {
            alert("non hai selezionato nessun file");
        }
    } else {
        var zipItem = {
            id: idDownload,
            name: $("#folder-name").val(),
            files: zip,
            status: "in coda"
        }
        downloads.push(zipItem);
        showDownloads();
        showSnackBar("download di " + zipItem.name + " in coda");
        idDownload++;
        queue.push(zipItem);
        updateDownloads();
    }
    folderSize = 0;
}


//downalod terminato con successo
function success(data) {
    var file;
    toGo.a = true;
    data = JSON.parse(data);
    downloads[data.folder].status = data.msg;
    downloads[data.folder].notAuth = data.notAuth;
    try {
        var blob = b64toBlob(data.item, 'application/zip');
        file = {
            base: data.item,
            blob: blob
        }
    } catch (err) {

    }

    fileReady[data.folder] = file;

    updateDownloads();
    showSnackBar("download di " + downloads[data.folder].name + " completato");
}

//errore nel download
function failure(data) {
    data = JSON.parse(data);
    downloads[data.folder].status = "download non riuscito";
    updateDownloads();
    $(".file-item").removeClass("selected");
}

//coversione da una stranda in base64 al relativo blob: b64Data la stringa da convertire, contentType l'estensione del file
function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, { type: contentType });
    return blob;
}

function directDownload(index) {
    var blob = fileReady[index].blob;
    var blobUrl = URL.createObjectURL(blob);
    window.location = blobUrl;
}

function sendMail(index) {
    var base = fileReady[index].base;
    base = {
        name: $("#folder-name").val(),
        data: base
    }
    var runner = google.script.run.withFailureHandler(showSnackBar("c'è stato un problema con l'invio della mail"));
    runner.withSuccessHandler(showSnackBar("mail inviata")).sendGMail(JSON.stringify(base));
    showSnackBar("invio mail in corso");
}

//mostra finestra dei downloads effettuati
function showDownloads() {
    activeList = "downloads";
    $('#my-downloads').show();
    $('#file-list').hide();
    $('#Myd').addClass("active");
    $('#Myc').removeClass("active");
    $('#home').removeClass("active");
    $('#load-box').hide();
    $('#my-contacts').hide();
    $('#title').text("I miei Downlaod");
}

function showContacts() {
    activeList = "contacts";
    $('#my-downloads').hide();
    $('#file-list').hide();
    $('#Myd').removeClass("active");
    $('#Myc').addClass("active");
    $('#home').removeClass("active");
    $('#load-box').hide();
    $('#my-contacts').show();
    $('#title').text("I miei Contatti");
}

//mostra lista dei file
function showFiles() {
    activeList = "files";
    $('#my-downloads').hide();
    $('#Myd').removeClass("active");
    $('#Myc').removeClass("active");
    $('#home').addClass("active");
    $('#file-list').show();
    $('#my-contacts').hide();
    $('#title').html("<span id='Il mio Drive' onClick='openFolder(id)'>Il mio Drive</span>");
}

//seleziona tutti i files nel drive  
function selectAll() {
    folderSize = 0;
    if (!selectedAllItems) {
        $(".file-item").addClass("selected");
        selectedAllItems = true;
        zip = files;
        $(".download-click").show();
        $("#current-folder").empty();
        for (item of zip) {
            $("#current-folder").append("<li class='list-group-item'>" + item.name + "</li>");
            folderSize += item.size;
        }
        $("#file-counter").text("file totali: " + zip.length);
        $("#file-size").text("dimensione: " + getMb(folderSize / 1024 / 1024, 2) + "Mb");
    } else {
        $(".file-item").removeClass("selected");
        selectedAllItems = false;
        zip = [];
        $(".download-click").hide();
        $("#current-folder").empty();
    }
}

//aggiornamento dello stato dei download
function updateDownloads() {
    $("#my-downloads").empty();
    for (item of downloads) {
        insertDownload(item);
    }
}

//inserisce icona di download con lo stato del download e le operazioni disponibili 
function insertDownload(zipItem) {
    var box = $("<div></div>").addClass("col-6 col-sm-3 placeholder").attr("id", zipItem.id);
    var icon = $("<i></i>").attr("onClick", "(function(){ showInfo(" + zipItem.id + ");})()");
    var options = [];
    var btnGroups = $("<div></div>").addClass("btn-group-vertical");
    switch (zipItem.status) {
        case "download in corso":
            $(icon).addClass("fa fa-circle-o-notch fa-spin");
            break;
        case "pronto per il download":
            $(icon).addClass("fa fa-download");
            options = [
                ["inizia a scaricare", "downloadFrom(" + zipItem.id + ")"]
            ];
            break
        case "download completato":
            $(icon).addClass("fa fa-check");
            options = [
                ["download diretto", "directDownload(" + zipItem.id + ")"],
                ["manda zip per e-mail", "sendMail(" + zipItem.id + ")"]
            ];
            break;
        case "download non riuscito":
            $(icon).addClass("fa fa-warning");
            options = [
                ["riprova", "retry(" + zipItem.id + ")"],
                ["annulla", "remove(" + zipItem.id + ")"]
            ];
            break;
        case "in coda":
            $(icon).addClass("fa fa-spinner fa-spin");
            options = [
                ["annulla", "removeFromQueue(" + zipItem.id + ")"]
            ];
            break;
    }
    $(box).append(icon);
    $(box).append("<h4>" + zipItem.name + "</h4>");
    $(box).append("<div class='text-muted'>" + zipItem.status + "</div>");
    for (item of options) {
        $(btnGroups).append("<button type='button' class='btn btn-outline-primary' onClick=(function(){" + item[1] + ";})()>" + item[0] + "</button>");
    }
    $(box).append(btnGroups);
    $("#my-downloads").append(box);
}

function getIcon(id) {
    var zipItem = downloads[id];
    var icon = $("<i></i>").attr("id", "info-icon");
    switch (zipItem.status) {
        case "download in corso":
            $(icon).addClass("fa fa-circle-o-notch fa-spin");
            break;
        case "pronto per il download":
            $(icon).addClass("fa fa-download");
            break
        case "download completato":
            $(icon).addClass("fa fa-check");
            break;
        case "download non riuscito":
            $(icon).addClass("fa fa-warning");
            break;
        case "in coda":
            $(icon).addClass("fa fa-spinner fa-spin");
            break;
    }

    return icon;
}

function remove(id) {
    downloads.splice(id, 1);
    updateDownloads();
}

function removeFromQueue(id) {
    downloads[id].status = "pronto per il download";
    queue.splice(queue.indexOf(downloads[id]), 1);
    updateDownloads();
}

//mostra informazioni su un pacchetto zip
function showInfo(id) {
    var obj = downloads[id];
    var icon = getIcon(id);
    var iconBox = $("<div></div>").addClass("text-center");
    var status = $("<p></p>").addClass("container-fluid text-center").html("<h5>" + obj.status + "</h4>");
    var name = $("<p></p>").addClass("container-fluid text-center").html("<h5>" + obj.name + "</h3>");
    var notAuthoredFiles = $("<ul></ul>").addClass("list-group").attr("id", "non-authored-files");
    var fileList = $("<ul></ul>").addClass("list-group").attr("id", "zip-items");
    var zipLenght = obj.files.length;
    if (obj.stauts == "download completato" || obj.status == "download non riuscito") {
        var zipLenght = obj.files.length - obj.notAuth.length;
        for (var i = 0; i < obj.files.length; i++) {
            if (findItemById(obj.notAuth, obj.files[i].id) == -1) {
                var listItem = $("<li></li>").addClass("list-group-item animate-bottom file-item").attr("id", "zip-item").text(obj.files[i].name);
                $(fileList).append(listItem);
            }
        }
        for (item of obj.notAuth) {
            var listItem = $("<li></li>").addClass("list-group-item animate-bottom file-item").attr("id", "not-authored-item").text(item.name);
            $(notAuthoredFiles).append(listItem);
        }
    } else {
        for (var i = 0; i < obj.files.length; i++) {
            var listItem = $("<li></li>").addClass("list-group-item animate-bottom file-item").attr("id", "zip-item").text(obj.files[i].name);
            $(fileList).append(listItem);
        }
    }

    $(iconBox).append(icon);
    $("#zip-info").empty();
    $("#zip-info").append("<i class='fa fa-window-close' aria-hidden='true' onClick='closeInfo()'></i>");
    $("#zip-info").append(iconBox);
    $("#zip-info").append(name);
    $("#zip-info").append(status);
    $("#zip-info").append("<h6>contenuto pacchetto (" + zipLenght + " files)</h6><hr>");
    $("#zip-info").append(fileList);
    if (obj.notAuth) {
        (obj.notAuth.lenght != 0) ? $("#zip-info").append("<h6>non è stato possibile scaricare i seguenti files</h6><hr>"): $("#zip-info").append("<h6>tutti i files sono stati scaricati correttamente</h6><hr>");
        $("#zip-info").append(notAuthoredFiles);
    }
    $("#zip-info").show();

}

function closeInfo() {
    $("#zip-info").hide();
}


function retry(id) {
    downloadFrom(id);
}


//divide il drive in pacchetti, notifica l'utente del nummero di pacchetti che riceverà e su conferma avvia il download   
function autoDownload() {
    var downloadArr = []; //array con i pacchetti da spedire all'utente
    var sizep = 0; //contatore per la dimensione di ogni pacchetto
    var errorFiles = []; //tutti i file > 25Mb vengono inseriti qua

    //ordinamendo in ordine crescente di dimensione dei file (tecica greedy)
    files.sort(function(a, b) {
        return a.size - b.size
    });

    //creazione pacchetti
    for (item of files) {
        if (sizep + item.size < 26214400) {
            zip.push(item);
            sizep += item.size;
        } else {
            if (zip.length != 0) downloadArr.push(zip);
            zip = [];
            sizep = 0;
            if (item.size < 52428800) {
                zip.push(item);
                sizep = item.size;
                downloadArr.push(zip)
            } else {
                errorFiles.push(item);
            }
        }
    }

    var conf = confirm("verranno creati " + downloadArr.length + " pacchetti, continuare?");
    if (conf == true) {
        showDownloads();
        for (item of downloadArr) {
            var zipItem = {
                id: idDownload,
                name: $("#folder-name").val() + " " + downloadArr.indexOf(item),
                files: item,
                status: "pronto per il download"
            }
            console.log(zipItem);
            idDownload++;
            insertDownload(zipItem);
            downloads.push(zipItem);
        }
        if (errorFiles.length != 0) {
            for (item of errorFiles) $("#errorFiles").append("<p>" + item.name + "</p>");
            $("#myModal").modal();
        }
    } else {}
}

function downloadFrom(id) {
    if (toGo.a == true) {
        toGo.a = false;
        var runner = google.script.run;
        runner.withFailureHandler(failure);
        runner.withSuccessHandler(success).downloadFiles(downloads[id]);
        showDownloads();
        showSnackBar("download di " + downloads[id].name + " in corso");
        $("#current-folder").empty();
        zip = [];
        $(".file-item").removeClass("selected");
        $("#file-counter").empty();
        $("#file-size").empty();
        downloads[id].status = "download in corso";
        updateDownloads();
    } else {
        downloads[id].status = "in coda";
        queue.push(downloads[id]);
        updateDownloads();
    }
}


//mostra una box sbnackbar con testo text
function showSnackBar(text) {
    var x = document.getElementById("snackbar");
    $(x).html(text);
    x.className = "show";
    setTimeout(function() { x.className = x.className.replace("show", ""); }, 3000);
}