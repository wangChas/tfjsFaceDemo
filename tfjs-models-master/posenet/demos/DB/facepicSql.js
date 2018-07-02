var express = require('express');
var router = express.Router();
var db = require("./DBConfig");
let bodyParser = require('body-parser')

router.use(bodyParser({limit: '50mb'}));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}))
/**
 * 查询列表页
 */
router.get("/",function(req, res, next){
    db.query("select * from facepic",function(err,rows){
        res.send(rows)
    });
});

router.post("/addPic", function(req, res, next){
    let image = req.body.image;
    db.query("insert into facepic(image) values('"+image+"')",function(err,rows){
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