/* global require */

console.log('- Demarrage du serveur');

var express = require('express');
var app = express();

app.use(express.compress());
app.use('/', express.static('webapp/'));
require('http').createServer(app).listen(8090);
