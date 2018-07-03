var express = require('express');
var router = express.Router();
var db = require("./DBConfig");
let bodyParser = require('body-parser')
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
router.use(bodyParser({limit: '50mb'}));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}))

router.use(cors())
/**
 * 查询列表页
 */
router.get("/",function(req, res, next){
    db.query("select * from facepic",function(err,rows){
        res.send(rows)
    });
});

router.post("/addPic", function(req, res, next){
    let src = req.body.src;
    db.query("insert into facepic(image) values('"+src+"')",function(err,rows){
        res.send(rows)
    });
});

router.get("/:id",function(req, res, next){
    let id = req.params.id;
    db.query("select * from facepic where faceid = '"+id+"'",function(err,rows){
        res.send(rows)
    });
});


router.get("/del/:id", function(req, res, next){
    let id = req.params.id;
    db.query("delete from facepic where faceId = '"+id+"'",function(err,rows){
        res.send(rows)
    });
});

module.exports = router;