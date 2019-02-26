function getRootFolder() {
    return DriveApp.getRootFolder();
}

function getFiles() {
    var root = getRootFolder();
    var data = [];
    var contacts = ContactsApp.getContacts();

    var files = DriveApp.getFiles();
    while (files.hasNext()) {
        var file = files.next();
        var parents = [];
        var p = file.getParents();
        while (p.hasNext()) {
            var par = p.next().getName();

            parents.push(par);
        }
        file = {
            id: file.getId(),
            name: file.getName(),
            size: file.getSize(),
            parent: parents,
            owner: file.getOwner().getName(),
            dateCreated: file.getDateCreated(),
            mimeType: file.getMimeType()
        };
        data.push(file);
    }
    for (var i = 0; i < contacts.length; i++) {
        var phones;
        try {
            phones = (contacts[i].getPhones()[0].getPhoneNumber());
        } catch (err) {}
        contacts[i] = {
            id: contacts[i].getId(),
            mail: contacts[i].getEmails()[0].getAddress(),
            nickName: contacts[i].getNickname(),
            name: contacts[i].getFullName(),
            cel: phones
        }
        var folders = DriveApp.getFolders();
        var fold = [];
        while (folders.hasNext()) {
            var f = folders.next();
            var parents = []
            var p = f.getParents();
            while (p.hasNext()) {
                var par = p.next().getName();

                parents.push(par);
            }
            var directory = {
                name: f.getName(),
                parents: parents,
                owner: f.getOwner().getName(),
                dateCreated: f.getDateCreated()
            }
            fold.push(directory);
        }


        var msg = {
            array: data,
            user: Session.getActiveUser().getEmail(),
            contacts: contacts,
            folders: fold
        }
        return JSON.stringify(msg);
    }
}

function getMyDrive(rootFolder, path) {
    Logger.log(rootFolder);
    var blobs = [];
    var files = rootFolder.getFiles();
    while (files.hasNext()) {
        var file = files.next();
        file = {
            id: file.getId(),
            name: file.getName(),
            size: file.getSize(),
            owner: file.getOwner().getName(),
            dateCreated: file.getDateCreated(),
            mimeType: file.getMimeType()
        };
        blobs.push(file);
    }
    var folders = rootFolder.getFolders();
    while (folders.hasNext()) {
        var folder = folders.next();
        var fPath = " ";
        blobs = blobs.concat(getMyDrive(folder, fPath));
    }
    return blobs;
}


//prende un array di file in input, lo conferte in blob e crea lo zip, ignora i file di cui l'utente non è o owner o editors
function downloadFiles(zipItem) {
    var blobs = [];
    var notAuthorized = [];

    for (var i = 0; i < zipItem.files.length; i++) {
        try {
            if (isDownloadble(zipItem.files[i].id)) {
                var blob = convert(zipItem.files[i].id);
                blobs.push(blob);
            } else {
                notAuthorized.push(zipItem.files[i]);
            }
        } catch (err) { notAuthorized.push(zipItem.files[i]); }
    }

    //controllo file con lo stesso nome, se trovo più file con lo stesso nome cambio il secondo con un indice
    for (var i = 0; i < blobs.length; i++) {
        for (var j = 0; j < blobs.length; j++) {
            if (i != j) {
                if (blobs[j].getName() == blobs[i].getName()) {
                    blobs[j].setName(blobs[j].getName().split(".")[0] + "()." + blobs[j].getName().split(".")[1]);
                }
            }
        }
    }

    //caso pacchetto vuoto, tutti i file inseriti non possono essere scaricati 
    if (blobs.length != 0) {
        var zipped = Utilities.zip(blobs, zipItem.name + '.zip');
        zipped = Utilities.base64Encode(zipped.getBytes());
        var statusText = "download completato";
    } else {
        var zipped = "noData";
        var statusText = "download non riuscito";
    }

    var response = {
        folder: zipItem.id,
        msg: statusText,
        notAuth: notAuthorized,
        item: zipped
    }

    return JSON.stringify(response);
}


//controlla se l'utente ha i diritti per scaricare il file con id fileId
function isDownloadble(fileId) {
    var editors = DriveApp.getFileById(fileId).getEditors();
    var owner = DriveApp.getFileById(fileId).getOwner();
    var okDownload = false;
    for (var i = 0; i < editors.length; i++) {
        if (editors[i].getEmail() == Session.getActiveUser().getEmail()) okDownload = true;
    }
    if (owner.getEmail() == Session.getActiveUser().getEmail()) okDownload = true;
    return okDownload;
}

//manda una mail all'user con allegato un pacchetto zip
function sendGMail(zip) {
    zip = JSON.parse(zip);
    var b = Utilities.newBlob(Utilities.base64Decode(zip.data), "application/zip").setName(zip.name + ".zip");
    GmailApp.sendEmail(Session.getActiveUser().getEmail(), "drive test", "Download your drive here", {
        attachments: [b],
        name: 'Automatic Emailer Script'
    });
    return JSON.stringify("ok");
}

function test() {
    Logger.log(DriveApp.getFolders().next());
}


function downloadFolder(item) {
    var folder = DriveApp.getFoldersByName(item.name).next();
    var zipped = Utilities.zip(getBlobs(folder, ''), folder.getName() + '.zip');
    zipped = Utilities.base64Encode(zipped.getBytes());
    var statusText = "download completato";

    var response = {
        folder: item.id,
        msg: statusText,
        item: zipped
    }

    return JSON.stringify(response);
}

function getBlobs(rootFolder, path) {
    var blobs = [];
    var names = {};
    var files = rootFolder.getFiles();
    while (files.hasNext()) {
        var file = files.next();
        file = convert(file.getId());
        var n = file.getName();
        while (names[n]) { n = '_' + n }
        names[n] = true;
        blobs.push(file.setName(path + n));
    }
    names = {};
    var folders = rootFolder.getFolders();
    while (folders.hasNext()) {
        var folder = folders.next();
        var n = folder.getName();
        while (names[n]) { n = '_' + n }
        names[n] = true;
        var fPath = path + n + '/';
        blobs.push(Utilities.newBlob([]).setName(fPath));
        blobs = blobs.concat(getBlobs(folder, fPath));
    }
    return blobs;
}