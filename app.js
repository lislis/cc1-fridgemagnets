/***********************************************************
 * app.js
 *
 * Author: Lena Gieseke
 *
 * Date: December 2018
 * Update: January 2021
 *
 * Purpose: Browser-based representation
 *          of word magnets on a fridge.
 *
 * Usage:
 *
 * Notes: SOLUTION
 *
 *********************************************************/


// Loading the modules
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');

const port = process.env.PORT || 3000;

// The following line, which we used in the
// storytelling app, returns a function that
// can handle express request functions
// needed for routing. In this example
// we use no routes but only one index.html
// and therefor don't really need this line
// (for creating the server below, we could
// also just use express().use().listen())
const app = express();

// Insert your connection string
const dbUrl = process.env.DB_URL;

// Connecting
mongoose.connect(dbUrl, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log('Connection established to', dbUrl))
    .catch(err => console.error('Unable to connect to the mongoDB server. Error:', err.message));


let MagnetSchema = new mongoose.Schema(
    {
        index: Number,
        x: Number,
        y: Number,
    });

let Magnet = mongoose.model('magnet', MagnetSchema);


// APPLICATION ////////////////////////////////////////

// For the socketIO constructor,
// we need an express server instance,
// which is started to listen for
// connections on the given port:
const server = app
      .use(express.static('public'))
      .listen(port, () => console.log(`Listening on ${port}`));

// Creating a new communication pipe
// based on the given express server and port
const io = socketio(server);
// The above line is the same as
// const io = require('socket.io')(server);

// Adds a callback function ("listener")
// for the event "connection", which
// the express server emits.
// "on" stands for "addEventListener"
io.on('connection', socket => {
    console.log('New client connected');

    // Receive moving signal from a client
    socket.on('clientMagnetMove', (data) => {
        console.log('Moved:', data);

        // Send the movement data to all
        // other clients
        socket.broadcast.emit('serverBroadcastMagnetMove', data);

        // Update the position in the database
        Magnet.findOne({index:Number(data.index)})
            .then(docs => {
                if(docs !== null) {
                    docs.x = data.x;
                    docs.y = data.y;
                    docs.save();
                } else {
                    let tmpMagnet = new Magnet(data);
                    tmpMagnet.save()
                    // .then(doc => console.log('New element saved', doc))
                        .catch(err => console.error(err))
                }
            })
            .catch(err => console.error(err));
    });

    socket.on('clientSetupReady', () => {
        console.log('Client ready');

        Magnet.find()
            .then(docs => {
                if(docs.length == 0) {

                    console.log('Init Database');
                    socket.emit('serverAsksForMagnetData');

                } else {
                    console.log('Init Client');
                    socket.emit('serverSendsDbData', docs);

                }
            })
            .catch(err => console.error(err));
    });
});
