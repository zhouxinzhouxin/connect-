let connect = require('connect');
let cookieParser = require('cookie-parser');
let fs = require('fs');

function begin (req, res, next){
    fs.readFile('./index.html', 'utf-8', function(err,data){
       res.end(data);
    });
    next();
}
let app = connect()
    .use(begin)
    .use(function(req, res){
        res.setHeader('Set-Cookie', 'foo=bar');
        res.setHeader('Set-Cookie', 'tobi=zx; Expires=Tue, 08 Jun 2021 10:18:14 GMT');
        res.end();
    }).listen(3000);