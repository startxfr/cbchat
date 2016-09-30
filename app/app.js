/* global require */

console.log('- Demarrage du serveur');

var express = require('express');
var serveStatic = require('serve-static');
var app = express();

app.use(express.compress());
app.use('/', serveStatic('webapp/', {'index': ['index.html', 'index.htm']}));
require('http').createServer(app).listen(8090);
