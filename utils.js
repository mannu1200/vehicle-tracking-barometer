"use strict";

var 
    FS = require('fs'),
    PATH = require('path');


module.exports = {
    getDirectories: function(srcpath) {
        return FS.readdirSync(srcpath)
            .filter(file => FS.lstatSync(PATH.join(srcpath, file)).isDirectory())
    },

    createDir: function (dirPath) {
        try {
            FS.mkdirSync(dirPath);
        } catch(E) {
            console.log("Errorrrr: ", E);
        }
    }

}