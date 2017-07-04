1. Get the data files (Baro.txt) and MergedOutput files from the source (Android):
    node getFiles.js sourceDirPath
    Where
    sourceDirPath is the TravelDiaryApp dir from your android.
    e.g.
    node getFiles.js '/Volumes/Untitled/TravelDiaryApp/'

    output:
    It will copy the Baro.txt and MergedOutput-n.txt into the local dataFiles dir

Algo:

1. Parse all mergedOutput-n.txt and create a map of all the unique travel activities.
output: dataMap: 
{
    'YYYYMMDD' : {
        [[ts1,    ts2,    ts2,    ts3,    ts3]
        [place1, place1, place2, palce2, place5]]
    }
}

2. Parse the barometer files:
We have date and timestamp
currentDate
timestamp
//Get the place for given timestamp
update:
dataMap : {
    'vehicle' : {
        'date' : [].push(readings)
    }
}