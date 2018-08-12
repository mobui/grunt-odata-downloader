const https =  require('https');
const fs = require('fs');
const url = require('url');
const path = require('path');

var file = fs.createWriteStream("xx.xml");

https.get('https://services.odata.org/V2/Northwind/Northwind.svc/$metadata', (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  res.pipe(file);
  res.on('data', (d) => {
    file.write(d);
    process.stdout.write(d);
  });

}).on('error', (e) => {
  console.error(e);
});