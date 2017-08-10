### Assumptions:
  1. Ground truth: for every transport type ground truth will be the day for 
        which travel time was minimum and GPRS (loc.txt) is available for that day.

### Steps of execution:
  1. Get the data files (Baro.txt,Loc.txt) and MergedOutput files from the source (Android):
    
    node getFiles.js sourceDirPath
    Where
    sourceDirPath is the TravelDiaryApp dir from your android. 
    [Default: '/Volumes/Untitled/New\ folder/TravelDiaryApp/',]
    e.g.
    node getFiles.js '/Volumes/Untitled/TravelDiaryApp/'
    OR
    node getFiles.js

    Output:
    It will copy the Baro.txt and MergedOutput-n.txt into the local dataFiles dir


  2. Get the desired data (barometer readings and timestamp):
  
    node getData.js dataDirPath
    Where
    dataDirPath is the output from first script [default: './dataFiles/']
    e.g.
    node getData.js './dataFiles/'
    OR
    node getData.js

    Output:
    Barometer and timestamp with output dir grouped by travel type and timestamp


  3. Get the ground truth files:
    Create a ground truth file for every travel type, 
    It just copies the file in output dir for which travel time was minimum and 
    GPRS data is present (Refer assumption 1)
    
    node getGroundTruths.js outputDir dataDir
    Where 
    outputDir and dataDir you know it by now
    e.g.
    node getGroundTruths.js "./output/" "./dataFiles/"
    OR
    node getGroundTruths.js

    Output:
    groundTruth.txt file in every sub dir of output/ 

  4. Normalize timestamp:
    We dont want to use unix timestamp in the plots, this script replace the 
    unix timestamp with the time difference form the first entry (start of journey)
    Hence every file will have zero as first entry
    e.g.
    
    node normalizeTimestamps.js

  5. Plot the data:
    Real business, plot the data
    For every transit type plot a graph between ground truth and given data
    e.g.
    
    node plotCreator.js


### Algo:

1. Parse all mergedOutput-n.txt and create a map of all the unique travel activities.
output: dataMap: 
{
    'YYYYMMDD' : [[ts1,    ts2,    ts2,    ts3,    ts3]
                    [place1, place1, place2, place2, place3]],

    'YYYYMMDD' : [[ts1,    ts2,    ts2,    ts3,    ts3]
                    [place1, place1, place2, place2, place3]],

}

2. Parse the barometer files:
We have date and timestamp
currentDate
timestamp
//Get the place for given timestamp
create:
finalMap : {
    'vehicle' : {
        'date' : [].push(readings)
    }
}


#### TODO:
  1. Include loc in output of step 2 (in output data)
  2. Write a bash script for execution steps
