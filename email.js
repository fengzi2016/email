let express = require('express');
let Bodyparser = require('body-parser');
let cookieParser = require('cookie-parser');
let session = require('express-session');
let mysql = require('mysql');
let app = express();
app.use(cookieParser());
app.use(Bodyparser.urlencoded({ extended: false }));
app.use(express.static(__dirname));
var connection = mysql.createConnection({
    host: '119.28.63.95',
    user: 'myuser',
    password: 'hubuedu',
    port: '3306',
    database: 'twsjob',
});
connection.connect();

//获取职位详情
app.get('/getJobDetail', function (req, res) {
    let sql = 'SELECT * FROM t_job';
    connection.query(sql, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.status(500).send('服务器发生错误');
        }
        res.send(result);
        //result为对象数组
        //     [ RowDataPacket {
        // userId: 0,
        // id: 4,
        // title: 'oo',
        // company: '77',
        // description: 'ss',
        // applyApproach: 'sss',
        // expiryDate: 'sss',
        // category: 'development',
        // jobType: 'volunteer',
        // tags: '0',
        // city: 'newyork',
        // country: 'usa' }]
        connection.end();
    });
});
//接收发布招聘的信息
app.post('/postJob', function (req, res) {
    let addSql = 'INSERT INTO t_job(userId,title,company,description,applyApproach,expiryDate,category,jobType,tags,city,country) VALUES(?,?,?,?,?,?,?,?,?,?,?)'
    //传入给我的应该是个对象
    // {
    // userId:666,
    // title:'good',
    // company:'thoughtworks',
    // description:'goo',
    // applyApproach:'email',
    // expiryDate:'5years',
    // category:'manager',
    // jobType:'fulltime',
    // tags：'logo',
    // city:'shenzhen',
    // country:'China'
    //}
    console.log(req.body);
    let addSqlParams = [req.body.userId, req.body.title, req.body.company, req.body.description, req.body.applyApproach, req.body.expiryDate, req.body.category, req.body.jobType, req.body.tags, req.body.city, req.body.country
    ];
    connection.query(addSql, addSqlParams, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.status(500).send('服务器发生错误');
        }
        res.status(200).send('添加成功');
        connection.end();
    });
});
var mailer = require('./sendMailer');
var crypto = require('crypto');
app.get('/register', function (req, res) {
    res.sendfile('./email.html');
})
app.post('/register', function (req, res, next) {
    let username = req.body.username;
    let sqlbefore = 'SELECT * FROM t_user where email = ?'
    connection.query(sqlbefore, username, function (err, reply) {
        if(err){console.log(err)};
        console.log(reply);
        if (reply.length===0||reply.active===0) {
            crypto.randomBytes(20, function (err, buf) {
                // 保证激活码不会重复 
                req.body.activeToken = req.body.username + buf.toString('hex');
                // 设置过期时间为24小时()
                console.log(Date.now() + 24 * 3600 * 1000);
                req.body.activeExpires = new Date(Date.now() + 24 * 3600 * 1000);
                var link = '/active/'
                    + req.body.activeToken;

                // 发送激活邮件
                mailer({
                    to: req.body.username,
                    subject: 'WuTeam',
                    html: '请点击 <a href="' + link + '">此处</a> 激活。'
                });
                let addSql = 'INSERT INTO t_user(password,company,email,address,trade,activeToken,activeExpires) VALUES(?,?,?,?,?,?,?)';
                let addSqlParams = [req.body.password, req.body.company, req.body.username, req.body.address, req.body.trade, req.body.activeToken, req.body.activeExpires];

                // 保存用户对象
                connection.query(addSql, addSqlParams,
                    function (err, user) {
                        if (err) {
                            res.send('500');
                            console.log('Error:' + err);
                        } else {
                            res.send('已发送邮件至' + req.body.username + '，请在24小时内按照邮件提示激活。');
                        }
                    });
            });
        }else{
            res.end('用户已存在');
        }
    })
    // 生成20位激活码，`crypto`是nodejs内置的包

});
app.get('/active/:activeToken', function (req, res, next) {
    // 找到激活码对应的用户
    console.log(req.params.activeToken);
    let sql = `SELECT * FROM t_user where activeToken = ? and activeExpires > ? `;
    //  and  activeExpires > ${Date.now()}`;
    // 过期时间 > 当前时间

    let addSqlParams = [req.params.activeToken, new Date(Date.now())];
    connection.query(sql, addSqlParams, function (err, user) {
        if (err) { console.log('500'); res.send('500'); }
        // 激活码无效
        if (user.length===0) {
            return res.send('激活失败您的激活链接无效，请重新 <a href="./active/register">注册</a>');
        }
        // 激活并保存
        let activeSql='UPDATE t_user SET active=1 where id = ?'
        let active=user[0].id;
        connection.query(activeSql,active,function(err,reply){
            if(err){console.log(err);res.send('500');}
             res.send('激活成功' + user[0].email + '已成功激活，请前往 <a href="/account/login">登录</a>');
        })      
    });
});
app.listen(8081, function () {
    console.log('8081 is doing');
});