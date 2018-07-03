var express = require('express');
var router = express.Router();
let bodyParser = require('body-parser')
var db = require("./DBConfig");
let cors = require('cors')

// router.all('*', function (req, res, next) {
//     res.header("Access-Control-Allow-Origin",
//         "*");
//     res.header('Access-Control-Allow-Methods',
//         'PUT,GET,POST,DELETE,OPTIONS');
//     res.header("Access-Control-Allow-Headers",
//         "X-Requested-With");
//     res.header('Access-Control-Allow-Headers',
//         'Content-Type');
//     next();
// });
router.use(cors())

router.use(bodyParser({limit: '50mb'}));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}))
/**
 * 查询列表页
 */
router.get("/",function(req,res,next){
    db.query("select * from olduser",function(err,rows){
        res.send(rows)
    });
});

router.get("/:id",function(req,res,next){
    let id = req.params.id
    db.query("select * from olduser where faceId = " + id,function(err,rows){
        res.send(rows)
    });
});

router.post("/addNewUser", function(req, res, next){
    let uid = req.body.uid;
    let faceId = req.body.faceId;
    let info = req.body.faceMes;
    db.query("insert into olduser(uid, faceId, info, isNew) values('"+uid+"','"+faceId+"','"+ info +"',1)",function(err,rows){
        res.send(rows)
    });
});

router.get("/setOldUser/:id", function(req, res, next){
    let id = req.params.id;
    db.query("update olduser set isNew = 0 where uid =" + id, function(err,rows){
        res.send(rows)
    });
});


module.exports = router;