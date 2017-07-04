"use strict";

var 
    FS = require('fs'),
    PATH = require('path');

function getDirectories (srcpath) {
  return FS.readdirSync(srcpath)
    .filter(file => FS.lstatSync(PATH.join(srcpath, file)).isDirectory())
}

function createDir(dirPath) {
    try {
        FS.mkdirSync(dirPath);
    } catch(E) {
        //console.log("Errorrrr: ", E);
    }
}

function cloneFiles(source, destination) {
    FS.createReadStream(source).pipe(FS.createWriteStream(destination));
}

function getMergedOutputfileName(dir) {
    var list = [];
    FS.readdirSync(dir).forEach(file => {
        if(file.indexOf('MergedOutput') != -1)
            list.push(file);
    });
    //Get MergedOutput-n from the list
    var 
        regex = /\d+/,
        largestNumber = 0,
        result = null;
    
    list.forEach(function(file){
        var currentNumber = file.match(regex);
        //console.log(currentNumber, file);
        if(currentNumber && currentNumber[0] > largestNumber) {
            largestNumber = currentNumber[0];
            result = file;
        } else if(file == 'MergedOutput.txt') {
            largestNumber = 0,
            result = 'MergedOutput.txt';
        }
    });
    return result;
}

function main(dirPath, destPath, files) {
    
    var parentDirs = getDirectories(dirPath);
    parentDirs.forEach(function(dateDir) {
        createDir(destPath + dateDir);
        //Copy the data files
        files.forEach(function(dataFile){
            cloneFiles(dirPath + dateDir + '/' + dataFile, destPath + dateDir + '/' + dataFile);
        });
        //Copy MergedData file
        var fileName = getMergedOutputfileName(dirPath + dateDir);
        //console.log("File name:", fileName, ' for date: ', dateDir);
        if(fileName)
            cloneFiles(dirPath + dateDir + '/' + fileName, destPath + dateDir + '/' + fileName);
    });
}

(function() {
    if (require.main == module) {
        var
            dir = process.argv[2] || '/Volumes/Untitled/TravelDiaryApp/',
            destinationDir = 'dataFiles/',
            files = ['Baro.txt'];
            
        main(dir, destinationDir, files);
       //console.log(getMergedOutputfileName(dir + '2017-06-01/'));
    }
}());