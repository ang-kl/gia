# Static Map

# Sample Request below 

const data = JSON.stringify(false);
    
const xhr = new XMLHttpRequest();
    
xhr.addEventListener("readystatechange", function () {
      if (this.readyState === this.DONE) {
      }
    });
    
xhr.open("GET", "https://www.onemap.gov.sg/api/staticmap/getStaticImage?layerchosen=default&latitude=1.31955&longitude=103.84223&postal=&zoom=17&width=400&height=512&polygons=[[1.31955,103.84223],[1.31755,103.84223],[1.31755,103.82223],[1.31755,103.81223],[1.31955,103.84223]]:255,0,0&lines=[[1.31955,103.84223],[1.3204859, 103.8438367]]:177,0,0:3&points=[1.31955,103.84223]|[1.3204859, 103.8438367]&color=255,0,255&fillColor=0,255,0");
    
xhr.setRequestHeader("Authorization", "**********************");
    
xhr.send(data);

# End
##
##


# Public Transport Routing

# Sample Request - Public Transport Routing
const url = "https://www.onemap.gov.sg/api/public/routingsvc/route?date=11-10-2025&mode=TRANSIT&maxWalkDistance=1000&numItineraries=3&routeType=pt&time=11%3A19%3A47&start=1.3081592%2C103.8551479&end=1.2739864%2C103.8012642";
const authToken = '**********************';  // Replace with your access token

fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `${authToken}`,  // API token for authorization
  }
})
.then(response => response.json())  // Parse response as JSON
.then(data => console.log(data))     // Log the data to the console
.catch(error => console.error('Error:', error));  // Log any errors
Feedback

# End

##
##
##

# Sample - Response


{
  "requestParameters": {
    "mode": "TRANSIT,WALK",
    "date": "11-10-2025",
    "arriveBy": "false",
    "showIntermediateStops": "true",
    "fromPlace": "1.3081592,103.8551479",
    "transferPenalty": "1",
    "toPlace": "1.2739864,103.8012642",
    "maxWalkDistance": "1000",
    "time": "11:19 AM",
    "maxTransfers": "3",
    "numItineraries": "3"
  },
  "plan": {
    "date": 1762744740000,
    "from": {
      "name": "Origin",
      "lon": 103.8551479,
      "lat": 1.3081592,
      "vertexType": "NORMAL"
    },
    "to": {
      "name": "Destination",
      "lon": 103.8012642,
      "lat": 1.2739864,
      "vertexType": "NORMAL"
    },
    "itineraries": [
      {
        "duration": 2238,
        "startTime": 1762744991000,
        "endTime": 1762747229000,
        "walkTime": 1129,
        "transitTime": 925,
        "waitingTime": 184,
        "walkDistance": 1197.74,
        "walkLimitExceeded": false,
        "generalizedCost": 10338,
        "elevationLost": 0,
        "elevationGained": 0,
        "transfers": 1,
        "fare": "1.77",
        "legs": [
          {
            "startTime": 1762744991000,
            "endTime": 1762745620000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 669.63,
            "generalizedCost": 4397,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "Origin",
              "lon": 103.8551479,
              "lat": 1.3081592,
              "departure": 1762744991000,
              "vertexType": "NORMAL"
            },
            "to": {
              "name": "FARRER PARK MRT STATION",
              "stopId": "FERRY:NE8",
              "stopCode": "NE8",
              "lon": 103.854361,
              "lat": 1.3126039,
              "arrival": 1762745620000,
              "departure": 1762745620000,
              "vertexType": "TRANSIT"
            },
            "legGeometry": {
              "points": "co~Fme{xR??UMEACDGJCFOQE?[QEC_@Q?CQKE?[QYJi@_@I@MSE?ACa@[IEi@c@ECIG?AGCWUKGA?WQK?C?UPQLm@h@m@f@IJg@b@ED[VCBGF?BUPA@A??@EBu@b@q@^E@CBWNABAD@B?BLLSPNLUT",
              "length": 64
            },
            "steps": [
              {
                "distance": 669.64,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "NORTHEAST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8551107,
                "lat": 1.3081822,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 629
          },
          {
            "startTime": 1762745620000,
            "endTime": 1762746334000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 7115.75,
            "generalizedCost": 1389,
            "pathway": false,
            "mode": "SUBWAY",
            "transitLeg": true,
            "route": "NE",
            "agencyName": "SBS Transit",
            "agencyUrl": "http://www.sbstransit.com.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 1,
            "routeId": "NE",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:SBST",
            "tripId": "NE-2-3023",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "FARRER PARK MRT STATION",
              "stopId": "FERRY:NE8",
              "stopCode": "NE8",
              "lon": 103.854361,
              "lat": 1.3126039,
              "arrival": 1762745620000,
              "departure": 1762745620000,
              "stopIndex": 10,
              "stopSequence": 11,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "HARBOURFRONT MRT STATION",
              "stopId": "FERRY:NE1",
              "stopCode": "NE1",
              "lon": 103.8215302,
              "lat": 1.2653894,
              "arrival": 1762746334000,
              "departure": 1762746518000,
              "stopIndex": 16,
              "stopSequence": 17,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [
              {
                "name": "LITTLE INDIA MRT STATION",
                "stopId": "FERRY:NE7",
                "stopCode": "NE7",
                "lon": 103.8496464,
                "lat": 1.3067411,
                "arrival": 1762745684000,
                "departure": 1762745714000,
                "stopIndex": 11,
                "stopSequence": 12,
                "vertexType": "TRANSIT"
              },
              {
                "name": "DHOBY GHAUT MRT STATION",
                "stopId": "FERRY:NE6",
                "stopCode": "NE6",
                "lon": 103.8453759,
                "lat": 1.2996206,
                "arrival": 1762745790000,
                "departure": 1762745820000,
                "stopIndex": 12,
                "stopSequence": 13,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CLARKE QUAY MRT STATION",
                "stopId": "FERRY:NE5",
                "stopCode": "NE5",
                "lon": 103.8466109,
                "lat": 1.2887102,
                "arrival": 1762745928000,
                "departure": 1762745958000,
                "stopIndex": 13,
                "stopSequence": 14,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CHINATOWN MRT STATION",
                "stopId": "FERRY:NE4",
                "stopCode": "NE4",
                "lon": 103.8432502,
                "lat": 1.2840949,
                "arrival": 1762746006000,
                "departure": 1762746036000,
                "stopIndex": 14,
                "stopSequence": 15,
                "vertexType": "TRANSIT"
              },
              {
                "name": "OUTRAM PARK MRT STATION",
                "stopId": "FERRY:NE3",
                "stopCode": "NE3",
                "lon": 103.8395135,
                "lat": 1.2797397,
                "arrival": 1762746092000,
                "departure": 1762746122000,
                "stopIndex": 15,
                "stopSequence": 16,
                "vertexType": "TRANSIT"
              }
            ],
            "legGeometry": {
              "points": "mj_G_a{xRs@w@z@~@|DdE??DFFDDDDDDFDD??DDDDFDDFJHHHHFFDDDFDDDFDDDFBDDFD??FD`FlD@BB@BBB@B@@BB@B@BBB@VRHDBBB@B@BBB@B@@@BBB@B@??BB??B@@@B@BBB@B@BB@@B@JFVPBBB@BB@@B@BBB@@@BBB@nFxDjBrA??fChBnBtABBB@@@BBB@B@@BB@??BBB@XPVPXPXPZPXNZNRJB@B@B@B@B@B@B@BBB@??B@??fXvLrAl@??f@T??JDHDJDJDHDFBB@HDHB@@JBJDHBJDJBJBJBJBJBJBJBJ@LBJ@J@J@J@L@J@J@J?L@J?J?L?J?J?L?J?JAJ?LAJ?JALAJAJAJCJAJCLAJCJCJCJCJCHCJCJEJC@AHCJEJEHEJEJEHEJEHEJEdNoGHEJEHEJEHEJEJEHEJCJEFCJELCJEJCJCJCJCLCJCJALCJALAJALAJALAJALAJ?L?JAL?J?L?J?L@L?J@L?J@L@J@L@J@JBL@JBJ@JBJBJ@JBJBJBLBHBzBf@NB??zD~@JBJBJDD@JDJBHDJDJD^VXPd@Zj@j@j@h@X\|@`A|@r@TTTTb@^JHpCzB`Av@??zBjB|AnADBBBDBBBBBDDBBDBBBDBPLRNTNPJBBDBDBBBD@BBDBDBBBD@t@d@DBBBDBD@BBDBBBD@DBBB@@RLTNRN@?A?SOA?@?RNRNRNPPRNPPPPNN@@DBBBBD@@@@BBDBFHBBBD??nBtBNP??`HpHFFDDDDDFDDDDDFDDDDDFBBHJHJFLHJHJFLFJHLBFBFDDBFBFDFBFBFBFBFR`@BF??BF??DFBFBFBFDFBDBFDFFJFLHLFJHJHJHLHJHJHJHHJJ@@DDDDDDDFFDDDDDFDDDDD??bJjIB@@BB@BB@@BB@@BBB@@BVRVTVRXPRPB@B@??BB@@BBB@B@BB@@B@hBlADBBBDBBBDBBBDBB@DBBB@@RNRNRNPPPNPPDBBBBBBDDBBBBBBBBDDB??t]|]HFFHFFHHFFFHHHFFFHFHDDFHFJFHFHFHDJFHDJDHFJDJDJDHDJBJDJDJBJBJDJBLBJ@JBJBL@JBJ@L@J@J@L@J@J@J?L@J?J@J@L???J\xK",
              "length": 522
            },
            "steps": [],
            "routeShortName": "NE",
            "routeLongName": "NORTH EAST LINE",
            "duration": 714
          },
          {
            "startTime": 1762746518000,
            "endTime": 1762746729000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 2251.66,
            "generalizedCost": 1146,
            "pathway": false,
            "mode": "SUBWAY",
            "transitLeg": true,
            "route": "CC",
            "agencyName": "SMRT Corporation",
            "agencyUrl": "http://www.smrt.com.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 1,
            "routeId": "CC",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:SMRT",
            "tripId": "CC-2-3045",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "HARBOURFRONT MRT STATION",
              "stopId": "FERRY:CC29",
              "stopCode": "CC29",
              "lon": 103.8215302,
              "lat": 1.2653894,
              "arrival": 1762746334000,
              "departure": 1762746518000,
              "stopIndex": 0,
              "stopSequence": 1,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "LABRADOR PARK MRT STATION",
              "stopId": "FERRY:CC27",
              "stopCode": "CC27",
              "lon": 103.8030136,
              "lat": 1.2723092,
              "arrival": 1762746729000,
              "departure": 1762746729000,
              "stopIndex": 2,
              "stopSequence": 3,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [
              {
                "name": "TELOK BLANGAH MRT STATION",
                "stopId": "FERRY:CC28",
                "stopCode": "CC28",
                "lon": 103.8097616,
                "lat": 1.2707065,
                "arrival": 1762746636000,
                "departure": 1762746666000,
                "stopIndex": 1,
                "stopSequence": 2,
                "vertexType": "TRANSIT"
              }
            ],
            "legGeometry": {
              "points": "ucvFistxRJfD?lBG~@Y|Aa@hAk@`A}@hAyB~B{ApCSb@]z@oAdDWn@q@|AU`@sHzNa@|@Y`AQdAIdASrE???BKpCIbBCt@Et@M`AQ`AS~@m@`BSb@c@x@s@tA_@t@_@~@Qn@Kh@MnACb@E|@GnB?N",
              "length": 44
            },
            "steps": [],
            "routeShortName": "CC",
            "routeLongName": "CIRCLE LINE",
            "duration": 211
          },
          {
            "startTime": 1762746729000,
            "endTime": 1762747229000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 528.11,
            "generalizedCost": 3479,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "LABRADOR PARK MRT STATION",
              "stopId": "FERRY:CC27",
              "stopCode": "CC27",
              "lon": 103.8030136,
              "lat": 1.2723092,
              "arrival": 1762746729000,
              "departure": 1762746729000,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "Destination",
              "lon": 103.8012642,
              "lat": 1.2739864,
              "arrival": 1762747229000,
              "vertexType": "NORMAL"
            },
            "legGeometry": {
              "points": "{nwFy_qxR??d@P?d@O?IHG@yBJ?t@@@ABKv@WXCAACGAQAYAC?K?O?A?M@[@Q@a@@??A???G???A?WDO@_@HQ@A@Q?@D@?@H??^EFAFBDDY|@tAh@",
              "length": 48
            },
            "steps": [
              {
                "distance": 528.11,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "SOUTHWEST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8030135,
                "lat": 1.2723091,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 500
          }
        ],
        "tooSloped": false,
        "arrivedAtDestinationWithRentedBicycle": false
      },
      {
        "duration": 2268,
        "startTime": 1762744991000,
        "endTime": 1762747259000,
        "walkTime": 810,
        "transitTime": 1021,
        "waitingTime": 437,
        "walkDistance": 856.97,
        "walkLimitExceeded": false,
        "generalizedCost": 9172,
        "elevationLost": 0,
        "elevationGained": 0,
        "transfers": 2,
        "fare": "1.77",
        "legs": [
          {
            "startTime": 1762744991000,
            "endTime": 1762745620000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 669.63,
            "generalizedCost": 4397,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "Origin",
              "lon": 103.8551479,
              "lat": 1.3081592,
              "departure": 1762744991000,
              "vertexType": "NORMAL"
            },
            "to": {
              "name": "FARRER PARK MRT STATION",
              "stopId": "FERRY:NE8",
              "stopCode": "NE8",
              "lon": 103.854361,
              "lat": 1.3126039,
              "arrival": 1762745620000,
              "departure": 1762745620000,
              "vertexType": "TRANSIT"
            },
            "legGeometry": {
              "points": "co~Fme{xR??UMEACDGJCFOQE?[QEC_@Q?CQKE?[QYJi@_@I@MSE?ACa@[IEi@c@ECIG?AGCWUKGA?WQK?C?UPQLm@h@m@f@IJg@b@ED[VCBGF?BUPA@A??@EBu@b@q@^E@CBWNABAD@B?BLLSPNLUT",
              "length": 64
            },
            "steps": [
              {
                "distance": 669.64,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "NORTHEAST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8551107,
                "lat": 1.3081822,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 629
          },
          {
            "startTime": 1762745620000,
            "endTime": 1762746334000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 7115.75,
            "generalizedCost": 1389,
            "pathway": false,
            "mode": "SUBWAY",
            "transitLeg": true,
            "route": "NE",
            "agencyName": "SBS Transit",
            "agencyUrl": "http://www.sbstransit.com.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 1,
            "routeId": "NE",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:SBST",
            "tripId": "NE-2-3023",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "FARRER PARK MRT STATION",
              "stopId": "FERRY:NE8",
              "stopCode": "NE8",
              "lon": 103.854361,
              "lat": 1.3126039,
              "arrival": 1762745620000,
              "departure": 1762745620000,
              "stopIndex": 10,
              "stopSequence": 11,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "HARBOURFRONT MRT STATION",
              "stopId": "FERRY:NE1",
              "stopCode": "NE1",
              "lon": 103.8215302,
              "lat": 1.2653894,
              "arrival": 1762746334000,
              "departure": 1762746518000,
              "stopIndex": 16,
              "stopSequence": 17,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [
              {
                "name": "LITTLE INDIA MRT STATION",
                "stopId": "FERRY:NE7",
                "stopCode": "NE7",
                "lon": 103.8496464,
                "lat": 1.3067411,
                "arrival": 1762745684000,
                "departure": 1762745714000,
                "stopIndex": 11,
                "stopSequence": 12,
                "vertexType": "TRANSIT"
              },
              {
                "name": "DHOBY GHAUT MRT STATION",
                "stopId": "FERRY:NE6",
                "stopCode": "NE6",
                "lon": 103.8453759,
                "lat": 1.2996206,
                "arrival": 1762745790000,
                "departure": 1762745820000,
                "stopIndex": 12,
                "stopSequence": 13,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CLARKE QUAY MRT STATION",
                "stopId": "FERRY:NE5",
                "stopCode": "NE5",
                "lon": 103.8466109,
                "lat": 1.2887102,
                "arrival": 1762745928000,
                "departure": 1762745958000,
                "stopIndex": 13,
                "stopSequence": 14,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CHINATOWN MRT STATION",
                "stopId": "FERRY:NE4",
                "stopCode": "NE4",
                "lon": 103.8432502,
                "lat": 1.2840949,
                "arrival": 1762746006000,
                "departure": 1762746036000,
                "stopIndex": 14,
                "stopSequence": 15,
                "vertexType": "TRANSIT"
              },
              {
                "name": "OUTRAM PARK MRT STATION",
                "stopId": "FERRY:NE3",
                "stopCode": "NE3",
                "lon": 103.8395135,
                "lat": 1.2797397,
                "arrival": 1762746092000,
                "departure": 1762746122000,
                "stopIndex": 15,
                "stopSequence": 16,
                "vertexType": "TRANSIT"
              }
            ],
            "legGeometry": {
              "points": "mj_G_a{xRs@w@z@~@|DdE??DFFDDDDDDFDD??DDDDFDDFJHHHHFFDDDFDDDFDDDFBDDFD??FD`FlD@BB@BBB@B@@BB@B@BBB@VRHDBBB@B@BBB@B@@@BBB@B@??BB??B@@@B@BBB@B@BB@@B@JFVPBBB@BB@@B@BBB@@@BBB@nFxDjBrA??fChBnBtABBB@@@BBB@B@@BB@??BBB@XPVPXPXPZPXNZNRJB@B@B@B@B@B@B@BBB@??B@??fXvLrAl@??f@T??JDHDJDJDHDFBB@HDHB@@JBJDHBJDJBJBJBJBJBJBJBJ@LBJ@J@J@J@L@J@J@J?L@J?J?L?J?J?L?J?JAJ?LAJ?JALAJAJAJCJAJCLAJCJCJCJCJCHCJCJEJC@AHCJEJEHEJEJEHEJEHEJEdNoGHEJEHEJEHEJEJEHEJCJEFCJELCJEJCJCJCJCLCJCJALCJALAJALAJALAJALAJ?L?JAL?J?L?J?L@L?J@L?J@L@J@L@J@JBL@JBJ@JBJBJ@JBJBJBLBHBzBf@NB??zD~@JBJBJDD@JDJBHDJDJD^VXPd@Zj@j@j@h@X\|@`A|@r@TTTTb@^JHpCzB`Av@??zBjB|AnADBBBDBBBBBDDBBDBBBDBPLRNTNPJBBDBDBBBD@BBDBDBBBD@t@d@DBBBDBD@BBDBBBD@DBBB@@RLTNRN@?A?SOA?@?RNRNRNPPRNPPPPNN@@DBBBBD@@@@BBDBFHBBBD??nBtBNP??`HpHFFDDDDDFDDDDDFDDDDDFBBHJHJFLHJHJFLFJHLBFBFDDBFBFDFBFBFBFBFR`@BF??BF??DFBFBFBFDFBDBFDFFJFLHLFJHJHJHLHJHJHJHHJJ@@DDDDDDDFFDDDDDFDDDDD??bJjIB@@BB@BB@@BB@@BBB@@BVRVTVRXPRPB@B@??BB@@BBB@B@BB@@B@hBlADBBBDBBBDBBBDBB@DBBB@@RNRNRNPPPNPPDBBBBBBDDBBBBBBBBDDB??t]|]HFFHFFHHFFFHHHFFFHFHDDFHFJFHFHFHDJFHDJDHFJDJDJDHDJBJDJDJBJBJDJBLBJ@JBJBL@JBJ@L@J@J@L@J@J@J?L@J?J@J@L???J\xK",
              "length": 522
            },
            "steps": [],
            "routeShortName": "NE",
            "routeLongName": "NORTH EAST LINE",
            "duration": 714
          },
          {
            "startTime": 1762746518000,
            "endTime": 1762746636000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 1463.77,
            "generalizedCost": 1053,
            "pathway": false,
            "mode": "SUBWAY",
            "transitLeg": true,
            "route": "CC",
            "agencyName": "SMRT Corporation",
            "agencyUrl": "http://www.smrt.com.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 1,
            "routeId": "CC",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:SMRT",
            "tripId": "CC-2-3045",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "HARBOURFRONT MRT STATION",
              "stopId": "FERRY:CC29",
              "stopCode": "CC29",
              "lon": 103.8215302,
              "lat": 1.2653894,
              "arrival": 1762746334000,
              "departure": 1762746518000,
              "stopIndex": 0,
              "stopSequence": 1,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "TELOK BLANGAH MRT STATION",
              "stopId": "FERRY:CC28",
              "stopCode": "CC28",
              "lon": 103.8097616,
              "lat": 1.2707065,
              "arrival": 1762746636000,
              "departure": 1762746636000,
              "stopIndex": 1,
              "stopSequence": 2,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [],
            "legGeometry": {
              "points": "ucvFistxRJfD?lBG~@Y|Aa@hAk@`A}@hAyB~B{ApCSb@]z@oAdDWn@q@|AU`@sHzNa@|@Y`AQdAIdASrE",
              "length": 22
            },
            "steps": [],
            "routeShortName": "CC",
            "routeLongName": "CIRCLE LINE",
            "duration": 118
          },
          {
            "startTime": 1762746636000,
            "endTime": 1762746684000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 48.35,
            "generalizedCost": 321,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "TELOK BLANGAH MRT STATION",
              "stopId": "FERRY:CC28",
              "stopCode": "CC28",
              "lon": 103.8097616,
              "lat": 1.2707065,
              "arrival": 1762746636000,
              "departure": 1762746636000,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "TELOK BLANGAH STN",
              "stopId": "FERRY:14161",
              "stopCode": "14161",
              "lon": 103.8100991,
              "lat": 1.2707587,
              "arrival": 1762746684000,
              "departure": 1762746937000,
              "vertexType": "TRANSIT"
            },
            "legGeometry": {
              "points": "{dwF_jrxR?@SAB]@KBS?C??",
              "length": 8
            },
            "steps": [
              {
                "distance": 48.35,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "NORTH",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8097551,
                "lat": 1.270707,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 48
          },
          {
            "startTime": 1762746937000,
            "endTime": 1762747126000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 1141.48,
            "generalizedCost": 1165,
            "pathway": false,
            "mode": "BUS",
            "transitLeg": true,
            "route": "963",
            "agencyName": "Tower Transit Services",
            "agencyUrl": "http://towertransit.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 3,
            "routeId": "963",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:TTS",
            "tripId": "963-2-2022",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "TELOK BLANGAH STN",
              "stopId": "FERRY:14161",
              "stopCode": "14161",
              "lon": 103.8100991,
              "lat": 1.2707587,
              "arrival": 1762746684000,
              "departure": 1762746937000,
              "stopIndex": 3,
              "stopSequence": 4,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "ALEXANDRA RETAIL CTR",
              "stopId": "FERRY:15041",
              "stopCode": "15041",
              "lon": 103.8018928,
              "lat": 1.2746332,
              "arrival": 1762747126000,
              "departure": 1762747126000,
              "stopIndex": 5,
              "stopSequence": 6,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [
              {
                "name": "OPP YEOS BLDG",
                "stopId": "FERRY:14171",
                "stopCode": "14171",
                "lon": 103.8065486,
                "lat": 1.2714596,
                "arrival": 1762746995000,
                "departure": 1762747025000,
                "stopIndex": 4,
                "stopSequence": 5,
                "vertexType": "TRANSIT"
              }
            ],
            "legGeometry": {
              "points": "{ewFclrxR??CpAARANA`@?B?BAHAJ?@????C^Eh@?D?@??WxDWbBs@lC?@?@A@?@AD????ELSn@GTAB?BA??@AB??{AlFa@lBU`BMnBCbC@`A?PY?O@Q?O@W@A?oBHiAH??c@BO@G?o@BG@A???A?O@",
              "length": 62
            },
            "steps": [],
            "routeShortName": "963",
            "routeLongName": "TTS BUS 963",
            "duration": 189
          },
          {
            "startTime": 1762747126000,
            "endTime": 1762747259000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 138.99,
            "generalizedCost": 919,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "ALEXANDRA RETAIL CTR",
              "stopId": "FERRY:15041",
              "stopCode": "15041",
              "lon": 103.8018928,
              "lat": 1.2746332,
              "arrival": 1762747126000,
              "departure": 1762747126000,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "Destination",
              "lon": 103.8012642,
              "lat": 1.2739864,
              "arrival": 1762747259000,
              "vertexType": "NORMAL"
            },
            "legGeometry": {
              "points": "m}wFyxpxRDB?D@J@H??^EFAFBDDY|@tAh@",
              "length": 12
            },
            "steps": [
              {
                "distance": 138.98,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "WEST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8018736,
                "lat": 1.2746076,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 133
          }
        ],
        "tooSloped": false,
        "arrivedAtDestinationWithRentedBicycle": false
      },
      {
        "duration": 2475,
        "startTime": 1762744846000,
        "endTime": 1762747321000,
        "walkTime": 583,
        "transitTime": 1325,
        "waitingTime": 567,
        "walkDistance": 613.54,
        "walkLimitExceeded": false,
        "generalizedCost": 7960,
        "elevationLost": 0,
        "elevationGained": 0,
        "transfers": 2,
        "fare": "1.81",
        "legs": [
          {
            "startTime": 1762744846000,
            "endTime": 1762745138000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 312.47,
            "generalizedCost": 2060,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "Origin",
              "lon": 103.8551479,
              "lat": 1.3081592,
              "departure": 1762744846000,
              "vertexType": "NORMAL"
            },
            "to": {
              "name": "BROADWAY HOTEL",
              "stopId": "FERRY:07111",
              "stopCode": "07111",
              "lon": 103.8531752,
              "lat": 1.3087937,
              "arrival": 1762745138000,
              "departure": 1762745138000,
              "vertexType": "TRANSIT"
            },
            "legGeometry": {
              "points": "co~Fme{xR??KREHWQKNS\oAxBi@`ACBQZ?B?B\PFDOVj@XLHRJCD??",
              "length": 21
            },
            "steps": [
              {
                "distance": 312.47,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "NORTHEAST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8551107,
                "lat": 1.3081822,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 292
          },
          {
            "startTime": 1762745138000,
            "endTime": 1762745210000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 507.5,
            "generalizedCost": 736,
            "pathway": false,
            "mode": "BUS",
            "transitLeg": true,
            "route": "131",
            "agencyName": "SBS Transit",
            "agencyUrl": "http://www.sbstransit.com.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 3,
            "routeId": "131",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:SBST",
            "tripId": "131-2-2012",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "BROADWAY HOTEL",
              "stopId": "FERRY:07111",
              "stopCode": "07111",
              "lon": 103.8531752,
              "lat": 1.3087937,
              "arrival": 1762745138000,
              "departure": 1762745138000,
              "stopIndex": 30,
              "stopSequence": 31,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "FARRER PK STN EXIT A",
              "stopId": "FERRY:50251",
              "stopCode": "50251",
              "lon": 103.854865,
              "lat": 1.312405,
              "arrival": 1762745210000,
              "departure": 1762745210000,
              "stopIndex": 31,
              "stopSequence": 32,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [],
            "legGeometry": {
              "points": "qr~F{yzxR[Qu@a@[QQKq@_@g@Yk@]sAu@[Qk@a@KIuAaAcBmAGPwBjA",
              "length": 16
            },
            "steps": [],
            "routeShortName": "131",
            "routeLongName": "SBST BUS 131",
            "duration": 72
          },
          {
            "startTime": 1762745210000,
            "endTime": 1762745277000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 64.25,
            "generalizedCost": 431,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "FARRER PK STN EXIT A",
              "stopId": "FERRY:50251",
              "stopCode": "50251",
              "lon": 103.854865,
              "lat": 1.312405,
              "arrival": 1762745210000,
              "departure": 1762745210000,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "FARRER PARK MRT STATION",
              "stopId": "FERRY:NE8",
              "stopCode": "NE8",
              "lon": 103.854361,
              "lat": 1.3126039,
              "arrival": 1762745277000,
              "departure": 1762745620000,
              "vertexType": "TRANSIT"
            },
            "legGeometry": {
              "points": "oi_G{c{xRAAWNABAD@B?BLLSPNLUT",
              "length": 11
            },
            "steps": [
              {
                "distance": 64.25,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "NORTHWEST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8548763,
                "lat": 1.3124125,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 67
          },
          {
            "startTime": 1762745620000,
            "endTime": 1762746334000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 7115.75,
            "generalizedCost": 1808,
            "pathway": false,
            "mode": "SUBWAY",
            "transitLeg": true,
            "route": "NE",
            "agencyName": "SBS Transit",
            "agencyUrl": "http://www.sbstransit.com.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 1,
            "routeId": "NE",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:SBST",
            "tripId": "NE-2-3023",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "FARRER PARK MRT STATION",
              "stopId": "FERRY:NE8",
              "stopCode": "NE8",
              "lon": 103.854361,
              "lat": 1.3126039,
              "arrival": 1762745277000,
              "departure": 1762745620000,
              "stopIndex": 10,
              "stopSequence": 11,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "HARBOURFRONT MRT STATION",
              "stopId": "FERRY:NE1",
              "stopCode": "NE1",
              "lon": 103.8215302,
              "lat": 1.2653894,
              "arrival": 1762746334000,
              "departure": 1762746334000,
              "stopIndex": 16,
              "stopSequence": 17,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [
              {
                "name": "LITTLE INDIA MRT STATION",
                "stopId": "FERRY:NE7",
                "stopCode": "NE7",
                "lon": 103.8496464,
                "lat": 1.3067411,
                "arrival": 1762745684000,
                "departure": 1762745714000,
                "stopIndex": 11,
                "stopSequence": 12,
                "vertexType": "TRANSIT"
              },
              {
                "name": "DHOBY GHAUT MRT STATION",
                "stopId": "FERRY:NE6",
                "stopCode": "NE6",
                "lon": 103.8453759,
                "lat": 1.2996206,
                "arrival": 1762745790000,
                "departure": 1762745820000,
                "stopIndex": 12,
                "stopSequence": 13,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CLARKE QUAY MRT STATION",
                "stopId": "FERRY:NE5",
                "stopCode": "NE5",
                "lon": 103.8466109,
                "lat": 1.2887102,
                "arrival": 1762745928000,
                "departure": 1762745958000,
                "stopIndex": 13,
                "stopSequence": 14,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CHINATOWN MRT STATION",
                "stopId": "FERRY:NE4",
                "stopCode": "NE4",
                "lon": 103.8432502,
                "lat": 1.2840949,
                "arrival": 1762746006000,
                "departure": 1762746036000,
                "stopIndex": 14,
                "stopSequence": 15,
                "vertexType": "TRANSIT"
              },
              {
                "name": "OUTRAM PARK MRT STATION",
                "stopId": "FERRY:NE3",
                "stopCode": "NE3",
                "lon": 103.8395135,
                "lat": 1.2797397,
                "arrival": 1762746092000,
                "departure": 1762746122000,
                "stopIndex": 15,
                "stopSequence": 16,
                "vertexType": "TRANSIT"
              }
            ],
            "legGeometry": {
              "points": "mj_G_a{xRs@w@z@~@|DdE??DFFDDDDDDFDD??DDDDFDDFJHHHHFFDDDFDDDFDDDFBDDFD??FD`FlD@BB@BBB@B@@BB@B@BBB@VRHDBBB@B@BBB@B@@@BBB@B@??BB??B@@@B@BBB@B@BB@@B@JFVPBBB@BB@@B@BBB@@@BBB@nFxDjBrA??fChBnBtABBB@@@BBB@B@@BB@??BBB@XPVPXPXPZPXNZNRJB@B@B@B@B@B@B@BBB@??B@??fXvLrAl@??f@T??JDHDJDJDHDFBB@HDHB@@JBJDHBJDJBJBJBJBJBJBJBJ@LBJ@J@J@J@L@J@J@J?L@J?J?L?J?J?L?J?JAJ?LAJ?JALAJAJAJCJAJCLAJCJCJCJCJCHCJCJEJC@AHCJEJEHEJEJEHEJEHEJEdNoGHEJEHEJEHEJEJEHEJCJEFCJELCJEJCJCJCJCLCJCJALCJALAJALAJALAJALAJ?L?JAL?J?L?J?L@L?J@L?J@L@J@L@J@JBL@JBJ@JBJBJ@JBJBJBLBHBzBf@NB??zD~@JBJBJDD@JDJBHDJDJD^VXPd@Zj@j@j@h@X\|@`A|@r@TTTTb@^JHpCzB`Av@??zBjB|AnADBBBDBBBBBDDBBDBBBDBPLRNTNPJBBDBDBBBD@BBDBDBBBD@t@d@DBBBDBD@BBDBBBD@DBBB@@RLTNRN@?A?SOA?@?RNRNRNPPRNPPPPNN@@DBBBBD@@@@BBDBFHBBBD??nBtBNP??`HpHFFDDDDDFDDDDDFDDDDDFBBHJHJFLHJHJFLFJHLBFBFDDBFBFDFBFBFBFBFR`@BF??BF??DFBFBFBFDFBDBFDFFJFLHLFJHJHJHLHJHJHJHHJJ@@DDDDDDDFFDDDDDFDDDDD??bJjIB@@BB@BB@@BB@@BBB@@BVRVTVRXPRPB@B@??BB@@BBB@B@BB@@B@hBlADBBBDBBBDBBBDBB@DBBB@@RNRNRNPPPNPPDBBBBBBDDBBBBBBBBDDB??t]|]HFFHFFHHFFFHHHFFFHFHDDFHFJFHFHFHDJFHDJDHFJDJDJDHDJBJDJDJBJBJDJBLBJ@JBJBL@JBJ@L@J@J@L@J@J@J?L@J?J@J@L???J\xK",
              "length": 522
            },
            "steps": [],
            "routeShortName": "NE",
            "routeLongName": "NORTH EAST LINE",
            "duration": 714
          },
          {
            "startTime": 1762746334000,
            "endTime": 1762746425000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 97.83,
            "generalizedCost": 646,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "HARBOURFRONT MRT STATION",
              "stopId": "FERRY:NE1",
              "stopCode": "NE1",
              "lon": 103.8215302,
              "lat": 1.2653894,
              "arrival": 1762746334000,
              "departure": 1762746334000,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "HARBOURFRONT STN/VIVOCITY",
              "stopId": "FERRY:14141",
              "stopCode": "14141",
              "lon": 103.8221133,
              "lat": 1.2655242,
              "arrival": 1762746425000,
              "departure": 1762746649000,
              "vertexType": "TRANSIT"
            },
            "legGeometry": {
              "points": "scvFqstxRDB@E?MGWBSJ_AM?Y@?DC?",
              "length": 11
            },
            "steps": [
              {
                "distance": 97.83,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "EAST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8215199,
                "lat": 1.2653506,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 91
          },
          {
            "startTime": 1762746649000,
            "endTime": 1762747188000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 2634.37,
            "generalizedCost": 1433,
            "pathway": false,
            "mode": "BUS",
            "transitLeg": true,
            "route": "97",
            "agencyName": "Tower Transit Services",
            "agencyUrl": "http://towertransit.sg/",
            "agencyTimeZoneOffset": 28800000,
            "routeType": 3,
            "routeId": "97",
            "interlineWithPreviousLeg": false,
            "agencyId": "1:TTS",
            "tripId": "97-2-2017",
            "serviceDate": "2025-11-10",
            "from": {
              "name": "HARBOURFRONT STN/VIVOCITY",
              "stopId": "FERRY:14141",
              "stopCode": "14141",
              "lon": 103.8221133,
              "lat": 1.2655242,
              "arrival": 1762746425000,
              "departure": 1762746649000,
              "stopIndex": 18,
              "stopSequence": 19,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "ALEXANDRA RETAIL CTR",
              "stopId": "FERRY:15041",
              "stopCode": "15041",
              "lon": 103.8018928,
              "lat": 1.2746332,
              "arrival": 1762747188000,
              "departure": 1762747188000,
              "stopIndex": 24,
              "stopSequence": 25,
              "vertexType": "TRANSIT"
            },
            "intermediateStops": [
              {
                "name": "OPP HARBOURFRONT INT",
                "stopId": "FERRY:14121",
                "stopCode": "14121",
                "lon": 103.8192566,
                "lat": 1.2659135,
                "arrival": 1762746692000,
                "departure": 1762746722000,
                "stopIndex": 19,
                "stopSequence": 20,
                "vertexType": "TRANSIT"
              },
              {
                "name": "CARIBBEAN AT KEPPEL BAY",
                "stopId": "FERRY:14131",
                "stopCode": "14131",
                "lon": 103.8167544,
                "lat": 1.2674013,
                "arrival": 1762746780000,
                "departure": 1762746810000,
                "stopIndex": 20,
                "stopSequence": 21,
                "vertexType": "TRANSIT"
              },
              {
                "name": "OPP HOTEL FABER PK",
                "stopId": "FERRY:14151",
                "stopCode": "14151",
                "lon": 103.8129359,
                "lat": 1.2696477,
                "arrival": 1762746882000,
                "departure": 1762746912000,
                "stopIndex": 21,
                "stopSequence": 22,
                "vertexType": "TRANSIT"
              },
              {
                "name": "TELOK BLANGAH STN",
                "stopId": "FERRY:14161",
                "stopCode": "14161",
                "lon": 103.8100991,
                "lat": 1.2707587,
                "arrival": 1762746970000,
                "departure": 1762747000000,
                "stopIndex": 22,
                "stopSequence": 23,
                "vertexType": "TRANSIT"
              },
              {
                "name": "OPP YEOS BLDG",
                "stopId": "FERRY:14171",
                "stopCode": "14171",
                "lon": 103.8065486,
                "lat": 1.2714596,
                "arrival": 1762747057000,
                "departure": 1762747087000,
                "stopIndex": 23,
                "stopSequence": 24,
                "vertexType": "TRANSIT"
              }
            ],
            "legGeometry": {
              "points": "ydvFcwtxRDbA?jA@d@@pAEt@A^Ev@[hAi@tA????Q^u@zA_@r@Wf@uB`Eu@xA????_AfB}DlIk@nAeAhBs@`Ai@~@????oBjD{@hB]tAMbACzB?DAP????IzCe@fHWbBu@tCAD????cCnIa@lBU`BMnBCbC@rA{@@O@iCJmBLO@G?kAF",
              "length": 57
            },
            "steps": [],
            "routeShortName": "97",
            "routeLongName": "TTS BUS 97",
            "duration": 539
          },
          {
            "startTime": 1762747188000,
            "endTime": 1762747321000,
            "departureDelay": 0,
            "arrivalDelay": 0,
            "realTime": false,
            "distance": 138.99,
            "generalizedCost": 919,
            "pathway": false,
            "mode": "WALK",
            "transitLeg": false,
            "route": "",
            "agencyTimeZoneOffset": 28800000,
            "interlineWithPreviousLeg": false,
            "from": {
              "name": "ALEXANDRA RETAIL CTR",
              "stopId": "FERRY:15041",
              "stopCode": "15041",
              "lon": 103.8018928,
              "lat": 1.2746332,
              "arrival": 1762747188000,
              "departure": 1762747188000,
              "vertexType": "TRANSIT"
            },
            "to": {
              "name": "Destination",
              "lon": 103.8012642,
              "lat": 1.2739864,
              "arrival": 1762747321000,
              "vertexType": "NORMAL"
            },
            "legGeometry": {
              "points": "m}wFyxpxRDB?D@J@H??^EFAFBDDY|@tAh@",
              "length": 12
            },
            "steps": [
              {
                "distance": 138.98,
                "relativeDirection": "DEPART",
                "streetName": "path",
                "absoluteDirection": "WEST",
                "stayOn": false,
                "area": false,
                "bogusName": true,
                "lon": 103.8018736,
                "lat": 1.2746076,
                "elevation": "",
                "walkingBike": false
              }
            ],
            "rentedBike": false,
            "walkingBike": false,
            "duration": 133
          }
        ],
        "tooSloped": false,
        "arrivedAtDestinationWithRentedBicycle": false
      }
    ]
  },
  "metadata": {
    "searchWindowUsed": 3000,
    "nextDateTime": 1762744980000,
    "prevDateTime": 1762741740000
  },
  "previousPageCursor": "rO0ABXc1AQANUFJFVklPVVNfUEFHRQsFb0SAAAAAAAAJYAAXU1RSRUVUX0FORF9BUlJJVkFMX1RJTUU=",
  "nextPageCursor": "rO0ABXcxAQAJTkVYVF9QQUdFCwV5lIAAAAAAAAlgABdTVFJFRVRfQU5EX0FSUklWQUxfVElNRQ==",
  "debugOutput": {
    "precalculationTime": 18295,
    "directStreetRouterTime": 150579692,
    "transitRouterTime": 409449920,
    "filteringTime": 4487845,
    "renderingTime": 410950,
    "totalTime": 564960088,
    "transitRouterTimes": {
      "tripPatternFilterTime": 27728191,
      "accessEgressTime": 34143385,
      "raptorSearchTime": 313841213,
      "itineraryCreationTime": 33722238
    }
  },
  "elevationMetadata": {
    "ellipsoidToGeoidDifference": 7.473258287745161,
    "geoidElevation": false
  }
}


# Sample Walk/Drive/Cycle Request

const url = "https://www.onemap.gov.sg/api/public/routingsvc/route?start=1.319728%2C103.8421&end=1.319728905%2C103.8421581&routeType=walk";
    const authToken = '**********************';  // Replace with your access token
    
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `${authToken}`,  // API token for authorization
      }
    })
    .then(response => response.json())  // Parse response as JSON
    .then(data => console.log(data))     // Log the data to the console
    .catch(error => console.error('Error:', error));  // Log any errors
Feedback


# End

# Sample Response - Walk/Drive/Cycle

{
  "status_message": "Found route between points",
  "route_geometry": "{u`GktxxR?G",
  "status": 0,
  "route_instructions": [
    [
      "Left",
      "",
      5,
      "1.319498,103.842142",
      3,
      "5m",
      "East",
      "North",
      "walking",
      "Head East"
    ],
    [
      "Left",
      "",
      0,
      "1.319502,103.842179",
      0,
      "0m",
      "North",
      "East",
      "walking",
      "You Have Arrived At Your Destination, On The Left"
    ]
  ],
  "route_name": [
    ""
  ],
  "route_summary": {
    "start_point": "",
    "end_point": "",
    "total_time": 3,
    "total_distance": 5
  }
}


# End





