const express = require("express");
const app = express();
const serverPort = 8080;

app.use(express.json({extended: true}));
var bodyParser = require('body-parser');

app.use(bodyParser.json());     
app.use(express.urlencoded());

app.use('/static', express.static('static'));
app.use('/static/lang', express.static('lang'));

const fs = require('fs');
var path = require('path');
var glob = require( 'glob' );
var language_dict = {};

app.engine('pug', require('pug').__express)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


//Start Server  
const server = app.listen(serverPort, () => {
    glob.sync( 'static/lang/*.json' ).forEach( function( file ) {
        let dash = file.split("/");
        if(dash.length == 3) {
            let dot = dash[2].split(".");
          if(dot.length == 2) {
            let lang = dot[0];

            fs.readFile(file, function(err, data) {
              language_dict[lang] = JSON.parse(data.toString());
            });
        }
        }
      });
    console.log('App running on http://localhost:'+serverPort);
});

//Startpage content (theme/statementContent) from backend
async function getStartpage() {
    try {
        const response = await fetch("https://env-9468449.appengine.flow.ch/items/Startpage?fields[]=*.*");
        if (!response.ok) {
            console.log('Startpage fetch not ok: '+response.status);
            return null;
        }
        const data = await response.json();
        return data.data || null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function renderStartpage(lang, res) {
    const locals = Object.assign({}, language_dict[lang]);

    const startpage = await getStartpage();
    const translations = startpage ? startpage.title : null;
    const translation = translations
        ? translations.find(t => t.languages_code === lang)
        : null;

    locals.newsContent = null;
    if (translation) {
        locals.theme = translation.Title || locals.theme;
        locals.statementContent = translation.Content || locals.statementContent;
        if (startpage.Show_News) {
            locals.newsContent = translation.News || null;
        }
    }

    res.render('index', locals);
}

// Renders
app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *");
});

app.get('/',(req,res) => {
    renderStartpage('de', res);
  });
app.get('/de',(req,res) => {
    renderStartpage('de', res);
});
app.get('/en',(req,res) => {
    renderStartpage('en', res);
});

//Websocket
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:8100",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});

io.on('connection', function(socket) {
    var userId = socket.id;
    console.log('joined: '+userId);
    socket.on('move', function(data){
        io.sockets.emit('moveTo', {id: userId,x:data.x, y:data.y});
    }); 
    socket.on('meeting', function(dataMeeting){
        console.log(dataMeeting)
        io.sockets.emit('meetingSend', {x: dataMeeting.x, y: dataMeeting.y } );
    }); 
    socket.on('disconnecting', function(socket){
        io.sockets.emit('left', userId);
    });
});