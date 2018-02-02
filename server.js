var connect = require('connect');
var parse = require('url').parse;

function setup(format) {  //setup函数可以用不同的配置调用多次
    var regexp = /:(\w+)/g;  //logger组件用正则表达式匹配请求属性
    return function logger(req, res, next) {  //Connect使用的真实logger组件
        var str = format.replace(regexp, function(match, property){  //用正则表达式格式化请求的日志条目
            return req[property];
        });
        console.log(str);  //将日志条目输出到控制台
        next();  //将控制权交给下一个中间件组件
    }
}

function hello(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    res.end('hello world');
}

function restrict(req, res, next) {
    var authorization = req.headers.authorization;
    if (!authorization) return next(new Error('Unauthorized'));
    var parts = authorization.split(' ')
    var scheme = parts[0]
    var auth = new Buffer(parts[1], 'base64').toString().split(':')
    var user = auth[0]
    var pass = auth[1];
    authenticateWithDatabase(user, pass, function (err) {  //根据数据库中的记录检查认证信息的函数
        if (err) return next(err);  //告诉分派器出错了
        next();   //如果认证信息有效，不带参数调用next()
    });
}

function admin(req, res, next) {
    switch (req.url) {
        case '/':
            res.end('try /users');
            break;
        case '/users':
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(['tobi', 'loki', 'jane']));
            break;
    }
}

//简易路由中间件
function route(obj) {
    return function(req, res, next){
        if (!obj[req.method]) {　//检查以确保req.method定义了
            next();
            return;  //如果未定义，调用next()，并停止一切后续操作
        }

        var routes = obj[req.method]  //查找req.method对应的路径
        var url = parse(req.url)  //解析URL，以便跟pathname匹配
        var paths = Object.keys(routes)  //将req.method对应的路径存放到数组中
        for (var i = 0; i < paths.length; i++) {  //遍历路径
            var path = paths[i];
            var fn = routes[path];
            path = path
                .replace(/\//g, '\\/')
                .replace(/:(\w+)/g, '([^\\/]+)');
            var re = new RegExp('^' + path + '$');  //构造正则表达式
            var captures = url.pathname.match(re)
            if (captures) {  //尝试跟pathname匹配
                var args = [req, res].concat(captures.slice(1));  //传递被捕获的分组
                fn.apply(null, args);
                return;  //当有相匹配的函数时，返回，以防止后续的next()调用
            }
        }
        next();
    }
}
var router = require('./middleware/router');　　//路由器组件，稍后定义
var routes = {  //定义路由的对象
    GET: {
        '/users': function(req, res){
            res.end('tobi, loki, ferret');
        },
        '/user/:id': function(req, res, id){  //其中的每一项都是对请求URL的映射，并包含要调用的回调函数
            res.end('user ' + id);
        }
    }, DELETE: {
        '/user/:id': function(req, res, id){
            res.end('deleted user ' + id);
        }
    }
};
// connect()
//     .use(router(routes))  //将路由对象传给路由器的setup函数
//     .listen(3000);



var path = url.parse(req.url).pathname;

function rewrite(req, res, next) {
    var match = path.match(/^\/blog\/posts\/(.+)/)
    if (match) {  //只针对/blog/posts请求执行查找
        findPostIdBySlug(match[1], function(err, id) {
            if (err) return next(err);  //如果查找出错，则通知错误处理器并停止处理
            if (!id) return next(new Error('User not found'));  //如果没找到跟缩略名相对应的ID，则带着“User not found”的错误参数调用next()
            req.url = '/blog/posts/' + id;  //重写req.url属性，以便后续中间件可以使用真实的ID
            next();
        });
    } else {
        next();
    }
}

function errorHandler() {
    var env = process.env.NODE_ENV || 'development';
    return function(err, req, res, next) {  //错误处理中间件定义四个参数
        res.statusCode = 500;
        switch (env) {  //errorHandler中间件组件根据NODE_ENV的值执行不同的操作
            case 'development':
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(err));
                break;
            default:
                res.end('Server error');
        }
    }
}
connect()
    .use(setup(':method :url'))
    .use('/admin', restrict)
    .use('/admin', admin)
    .use(hello)
    .use(errorHandler())
    .listen(3000);
