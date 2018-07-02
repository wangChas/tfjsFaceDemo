var express = require('express');
var router = express.Router();
let bodyParser = require('body-parser')
var db = require("./DBConfig");


router.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin",
        "*");
    res.header('Access-Control-Allow-Methods',
        'PUT,GET,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers",
        "X-Requested-With");
    res.header('Access-Control-Allow-Headers',
        'Content-Type');
    next();
});


router.use(bodyParser({limit: '50mb'}));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}))
/**
 * 查询列表页
 */
router.get("/",function(req,res,next){
    db.query("select * from newuser",function(err,rows){
        res.send(rows)
    });
});



router.post("/addNewUser", function(req, res, next){
    let uid = req.body.uid;
    let info = req.body.name;
    let image = req.body.image;
    db.query("insert into newuser(uid, photo, info) values('"+uid+"','"+image+"','"+ info +"')",function(err,rows){
        res.send(rows)
    });
});


router.get("/addNewUser")

module.exports = router;