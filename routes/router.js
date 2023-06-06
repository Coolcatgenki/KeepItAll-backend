const express= require("express");
const router= express.Router();
const schemas= require("../models/schemas");
const user= require("../index");

router.get("/items", async function(req, res){ 
  const listFind= await schemas.List.find({});
  res.send(listFind);
})

router.post("/toPost", async (req,res)=>{
    const inserte=req.body;
    if(Array.isArray(inserte)===true){
        const [ItemOne, ItemTwo]= inserte;
        const inserted1=  new schemas.List({...ItemOne});
        const inserted2=  new schemas.List({...ItemTwo});
        const findUser= await user.Model.find()
        const saveInserted= await schemas.List.insertMany([inserted1, inserted2]);
        if(saveInserted){
            res.send("Item sended!")
        }
        else{
            res.send("Failed")
        }
        res.end()
    }
    else{
        const inserted=  new schemas.List({...req.body})
        const saveInserted= await inserted.save();
        if(saveInserted){
            res.send("Item sended!")
        }
        else{
            res.send("Failed")
        }
        res.end()
    }
    console.log(req.body);
})

router.post("/toMark", async(req,res)=>{
    const mark=req.body.id;
    console.log(mark);
    const listFind=await schemas.List.find({})
    let marked= listFind.find(
        function (item,index){
        return index===mark;
        })
    const {_id, content, clicked}= marked;
    const markIt= await schemas.List.findOneAndUpdate({_id:_id}, {$set:{clicked:!clicked}})
    if(markIt){
      if(clicked===true){ 
      res.send("The item was dismarked!")
      }
      else{
      res.send("The item was marked!")
      } 
    }
    else{
    res.send("Failed Marked") 
    }   
})



module.exports= router;