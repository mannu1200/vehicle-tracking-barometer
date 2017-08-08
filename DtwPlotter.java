/*
   Program that plots the DTW warp path between two barometer curves.

   This program takes two (preferably normalized) barometer curves,
   finds the DTW warp path, and outputs gnuplot script that can plot
   the mapping between these two curves.
   The format of the data files is a CSV:
   Timestamp (in millisec), height (metres)

   The program generates script to stdout. The init of the
   gnuplot script is read from stdin.
   IMP: The end of the stdin is indicated by the line marker 
        #DTW-END. There are other markers to indicate the arrow
        section (see the gnuplot-init.txt for details).

   Compile:
   $ javac DtwPlotter.java
   Usage:
   $ java -Xmx500m DtwPlotter <path-to-curve1> <path-to-curve2> 
                              <graph-pdf-name> <sample-spacing>
                              <height-offset> <warp-window-constraint>
         < gnuplot-init.txt > gnuplot-dtw.txt
   Eg: java -Xmx500m DtwPlotter Data1.txt Data2.txt DtwPath.pdf 100 10 100
              < gnuplot-init.txt > gnuplot-dtw.txt

   The graph can be plotted using gnuplot and the generated script.
 */

import java.io.*;
import java.util.*;

public class DtwPlotter {

    /** Main starting point. */
    public static void main( String[] args ) {

        try {
            // Get the args
            if( args.length != 6 ) {
                System.err.println( "Usage: java -Xmx500m DtwPlotter <path-to-curve1> <path-to-curve2> " + 
                                    "<graph-pdf-name> <sample-spacing> <height-offset> <warp-window-constraint>" );
                return;
            }
            curveFile1 = new File( args[0] );
            curveFile2 = new File( args[1] );
            pdfName = args[2];
            sampleSpacing = Integer.parseInt( args[3] );
            heightCurveOffset = Double.parseDouble( args[4] );
            w = Integer.parseInt( args[5] );
            if( sampleSpacing < 0 ) {
                System.err.println( "Invalid sample spacing" );
                return;
            }
            else if( w < 0 ) {
                System.err.println( "Invalid warp window constraint" );
                return;
            }
            else if( ! curveFile1.isFile() || ! curveFile2.isFile() ) {
                System.err.println( "One/both of the curve files does/do not exist" );
                return;
            }

            // Get the OS-dependent line separator
            lineSeparator = System.getProperty( "line.separator" );

            // Read the sensor data files
            readDataFiles();
            // Read the gnuplot init file
            readGnuplotInit();
            // Run DTW and get the warp path
            findDtw();
            // Generate gnuplot file
            generateGnuplot();
        }
        catch( Exception e ) {
            e.printStackTrace();
        }
    }

    /** Reads the initialization of the gnuplot file. */
    private static void readGnuplotInit() 
        throws Exception {

        // Read the gnuplot file
        Scanner in = null;
        try {
            in = new Scanner( System.in );
            boolean arrowSectionStarted = false;
            boolean plotSectionStarted = false;
            while( in.hasNextLine() ) {
                String line = in.nextLine().trim();
                // Check whether Preamble, Arrow, or Plot sections
                if( line.equals( "#DTW-END" ) ) {
                    break;
                }
                else if( line.equals( "#DTW-ARROW-START" ) ) {
                    arrowSectionStarted = true;
                    continue;
                }
                else if( line.equals( "#DTW-ARROW-END" ) ) {
                    arrowSectionStarted = false;
                    plotSectionStarted = true;
                    continue;
                }

                // Store sections in memory
                if( arrowSectionStarted ) {
                    arrowSection.append( line );
                    arrowSection.append( lineSeparator );
                }
                else if( plotSectionStarted ) {
                    plotSection.append( line );
                    plotSection.append( lineSeparator );
                }
                else {
                    preambleSection.append( line );
                    preambleSection.append( lineSeparator );
                }
            }
        }
        finally {
            try {
                in.close();
            }
            catch( Exception e ) {
                // Nothing can be done
            }
        }
    }

    /** Reads the sensor data files. */
    private static void readDataFiles() 
        throws Exception {

        // Data file 1
        readDataFile( curveFile1 , dataArray1 );
        // Data file 2
        readDataFile( curveFile2 , dataArray2 );
    }

    /** Reads specified sensor data file. */
    private static void readDataFile( File file , 
                                      ArrayList <DataTuple> dataArray )
        throws Exception {

        // Read the data file
        Scanner in = null;
        try {
            in = new Scanner( file );
            while( in.hasNextLine() ) {
                String line = in.nextLine().trim();
                // Ignore comments
                if( line.startsWith( "#" ) ) {
                    continue;
                }
                String[] split = line.split( "," );
                // Read the (timestamp, data) tuple
                double timestamp = Double.parseDouble( split[0] );
                double data = Double.parseDouble( split[1] );
                DataTuple tuple = 
                    new DataTuple( timestamp , 
                                   data );
                // Append to the data array
                dataArray.add( tuple );
            }
        }
        finally {
            try {
                in.close();
            }
            catch( Exception e ) {
                // Nothing can be done
            }
        }
    }

    /** Finds the DTW warp path for two time series of (preferably same) size. */
    private static void findDtw() {

        // O(n^2) time and O(n^2) space
        ArrayList <DataTuple> s1 = dataArray1 , 
            s2 = dataArray2;
        int n1 = s1.size();
        int n2 = s2.size();

        // Allocate a warp matrix
        // NOTE: For 5000 points, this can occupy as much as 200 MB
        double[][] dtw = new double[n1 + 1][n2 + 1];

        // Constrain warping
        w = Math.max( w  , Math.abs( n1 - n2 ) );
        for( int i = 0 ; i <= n1 ; ++i ) {
            for( int j = 0 ; j <= n2 ; ++j ) {
                dtw[i][j] = Double.POSITIVE_INFINITY; // .MAX_VALUE;
            } 
        }

        // Init the left and bottom
        for( int i = 1 ; i <= n1 ; ++i ) {
            dtw[i][0] = Double.POSITIVE_INFINITY;//MAX_VALUE;
        }
        for( int i = 1 ; i <= n2 ; ++i ) {
            dtw[0][i] = Double.POSITIVE_INFINITY;//MAX_VALUE;
        }
        dtw[0][0] = 0.0;

        // Fill up the warp matrix
        for( int i = 1 ; i <= n1 ; ++i ) {

            // Constrain warping
            int startJ = Math.max( 1 , i - w );
            int stopJ = Math.min( n2 , i + w );

            //for( int j = 1 ; j <= n2 ; ++j ) {
            for( int j = startJ ; j <= stopJ ; ++j ) {
                double distance = 
                    Math.abs( s1.get( i - 1 ).data - s2.get( j - 1 ).data );

                // UPDATE: Penalize any difference even harder by squaring.
                //         But allow for sensor error/drift.
                double allowedError = 2.0;
                double sensorNoise = 2.0;
                if( distance < sensorNoise ) {
                    // Sensor noise
                    distance = 0.0;
                }
                else if( distance > allowedError ) {
                    // Penalize large errors
                    distance = distance * distance;
                }

                dtw[i][j] = distance + 
                    min( dtw[i - 1][j] , 
                         dtw[i][j - 1] , 
                         dtw[i - 1][j - 1] );
            }
        }

        // Find the warp path by backtracking
        // Start at [n1, n2], end at [1, 1]
        int i = n1 , j = n2;
        // Store the next mapping in warp path
        DataTuple[] dataTuplePair = 
            new DataTuple[] { s1.get( i - 1 ) , 
                              s2.get( j - 1 ) };
        warpPath.add( new WarpTuple( dataTuplePair , 
                                     new int[] { i - 1 , 
                                                 j - 1 } ) );
        int equalCount = 0;
        while( i > 1 || j > 1 ) {

            // Move backwards in the warp path, by picking
            //  the min value of [i,j-1], [i-1,j], [i-1,j-1]
            double downCost = dtw[i][j - 1] , 
                leftCost = dtw[i - 1][j] , 
                diagCost = dtw[i - 1][j - 1];

            // NOTE: This warp path code is taken from FastDTW
            // Determine which direction to move in. 
            // Prefer moving diagonally and moving towards the i==j axis 
            //  of the matrix if there are ties.
            if( ( diagCost <= leftCost ) && ( diagCost <= downCost ) ) {
                --i;
                --j;
            }
            else if( ( leftCost < diagCost ) && ( leftCost < downCost ) ) {
                --i;
            }
            else if( ( downCost < diagCost ) && ( downCost < leftCost ) ) {
                --j;
            }
            else if( i <= j ) {  // leftCost==rightCost > diagCost
                --j;
            }
            else {               // leftCost==rightCost > diagCost
                --i;
            }

            // Equal counts
            if( diagCost == leftCost || diagCost == downCost || 
                leftCost == downCost ) {
                ++equalCount;
            }

            // Store the next mapping in warp path
            dataTuplePair = 
                new DataTuple[] { s1.get( i - 1 ) , 
                                  s2.get( j - 1 ) };
            warpPath.add( new WarpTuple( dataTuplePair , 
                                         new int[] { i - 1 , 
                                                     j - 1 } ) );
        }
        System.err.println( "Equal count: " + equalCount );

        // Reverse the warp path to get [0,0] to [n1-1,n2-1]
        Collections.reverse( warpPath );
    }

    /** Min of 3 doubles. */
    private static double min( double a , double b , double c ) {
        return Math.min( a , Math.min( b  , c ) );
    }

    /** Generates gnuplot file. */
    private static void generateGnuplot() 
        throws Exception {
        // Output the preamble section
        System.out.print( preambleSection.toString() );

        // Output the height offset for the first curve
        System.out.println( "heightCurveOffset = " + heightCurveOffset );
        System.out.println();

        // Output the arrows
        String arrowFormat = arrowSection.toString();

        /*
        // METHOD 1: Output arrows at spaced intervals in warp path.
        for( int i = 0 ; i < warpPath.size() ; i += sampleSpacing ) { 
            DataTuple[] tuplePair = warpPath.get( i ).dataTuplePair;
            String arrowLine = String.format( arrowFormat , 
                                              tuplePair[0].timestamp / 1000.0 , 
                                              tuplePair[0].data + heightCurveOffset , 
                                              tuplePair[1].timestamp / 1000.0 , 
                                              tuplePair[1].data );
            System.out.print( arrowLine );
        }
        */

        // METHOD 2: Output arrows at spaced intervals in shorter data curve.
        //           Some points may have multiple mappings.
        // Find the signal with shorter time length
        int whichIndex = 0;  // 0 for first signal, 1 for second
        ArrayList <DataTuple> dataArray = dataArray1;
        DataTuple lastData1 = dataArray1.get( dataArray1.size() - 1 );
        DataTuple lastData2 = dataArray2.get( dataArray2.size() - 1 );
        if( lastData2.timestamp < lastData1.timestamp ) {
            whichIndex = 1;
            dataArray = dataArray2;
        }
        int warpIndex = 0;   // Current position in warp path
        for( int i = 0 ; i < dataArray.size() ; i += sampleSpacing ) {

            // Find the [i, j] in warp path where data i (or j) is equal to loop index i.
            int dataIndex = warpPath.get( warpIndex ).index[ whichIndex ];
            while( dataIndex != i ) {
                ++warpIndex;
                dataIndex = warpPath.get( warpIndex ).index[ whichIndex ];
            }

            // Draw the arrow for this [i, j] in the warp path
            DataTuple[] tuplePair = warpPath.get( warpIndex ).dataTuplePair;
            String arrowLine = String.format( arrowFormat , 
                                              tuplePair[0].timestamp / 1000.0 , 
                                              tuplePair[0].data + heightCurveOffset , 
                                              tuplePair[1].timestamp / 1000.0 , 
                                              tuplePair[1].data );
            System.out.print( arrowLine );
        }

        // Output the plot section
        String plotLine = String.format( plotSection.toString() , 
                                         pdfName , 
                                         curveFile1 , 
                                         curveFile2 );
        System.out.print( plotLine );
    }

    /** Data file 1. */
    private static File curveFile1;
    /** Data file 2. */
    private static File curveFile2;
    /** PDF Graph name. */
    private static String pdfName;
    /** Number of samples between two warp mapping lines. */
    private static int sampleSpacing;
    /** Height offset (metres, can be negative). */
    private static double heightCurveOffset;

    /** Contraint window on warp path around diagonal. */
    private static int w = 0;

    // Gnuplot init sections
    /** Preamble section. */
    private static StringBuilder preambleSection = 
        new StringBuilder();
    /** Arrow section. */
    private static StringBuilder arrowSection = 
        new StringBuilder();
    /** Plot section. */
    private static StringBuilder plotSection = 
        new StringBuilder();

    /** Stores (timestamp, data) tuple. */
    private static class DataTuple {
        public DataTuple( double timestamp , 
                          double data ) {
            this.timestamp = timestamp;
            this.data = data;
        }
        public double timestamp;
        public double data;
    }

    /** Data array 1. */
    private static ArrayList <DataTuple> dataArray1 = 
        new ArrayList <DataTuple>();
    /** Data array 2. */
    private static ArrayList <DataTuple> dataArray2 = 
        new ArrayList <DataTuple>();

    /** Stores the (DataTuple, i, j) complex tuple. */
    private static class WarpTuple {
        public WarpTuple( DataTuple[] dataTuplePair , 
                          int[] index ) {
            this.dataTuplePair = dataTuplePair;
            this.index = index;
        }
        public DataTuple[] dataTuplePair;
        public int[] index;
    }
    /** Warp path. */
    private static ArrayList< WarpTuple > warpPath = 
        new ArrayList< WarpTuple >();

    /** Line separator. */
    private static String lineSeparator = null;
}