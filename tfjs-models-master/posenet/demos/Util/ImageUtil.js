
function dataURLtoBlob(dataURI) {

var byteString = atob(dataURI.split(',')[1]);
var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
var ab = new ArrayBuffer(byteString.length);
var ia = new Uint8Array(ab);
for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
}
return new Blob([ab], {type: mimeString});
}

function base64toBuffer(base64) {
    return new Buffer(base64.replace(/^data:image\/\w+;base64,/,""),'base64')
}

function bufferToBase64(buffer) {
    return buffer.toString('base64');
}

module.exports = {
    dataURLtoBlob,
    base64toBuffer,
    bufferToBase64
}