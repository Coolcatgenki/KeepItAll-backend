require("dotenv").config();
const express= require("express");
const bodyParser= require("body-parser");
const cors= require("cors");
const mongoose= require("mongoose");
const PORT= process.env.PORT || 4000;
const bcrypt= require("bcrypt");
const saltRounds= 10;
const passport=require("passport");
const schemas= require("./models/schemas");
const jwt = require('jsonwebtoken');
const passportJwt= require("passport-jwt");
const ExtractJwt= passportJwt.ExtractJwt;
const StrategyJwt= passportJwt.Strategy;

const app= express();

const corsOptions={
    origin: process.env.CLIENT_UR,
    credentials:true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

const userSchema= new mongoose.Schema({
    username: {type: String, required: true, unique: true },
    password: String,
    email: {type: String, required: true, unique: true },
    list: [schemas.ListSchema],
    events:[schemas.EventSchema]
});


const userModel= new mongoose.model("users", userSchema);

passport.use(
    new StrategyJwt(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.SECRET
        },
        async function (jwtFromRequest, done){
            return await userModel.findOne({_id: jwtFromRequest.id})
            .then((user)=>{
                return done(null, user);
            })
            .catch((err)=>{
                return done(err);
            });
        }
    )
)
 

async function main(){
    try{
        const conn= await mongoose.connect(process.env.DB_UR)
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch(error) {
        console.log(error);
        process.exit(1);
    }
}


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

///////////////////////////////////////////START OF THE SING UP AND REGISTER ACTION/////////////////////////////////////////////////////////////

app.post("/register", function(req, res){
bcrypt.genSalt(saltRounds, function(_err, salt){
    bcrypt.hash(req.body.password, salt, async function(err, hash){
        const {email, username}= req.body;
        const findedUserEmail= await userModel.findOne({email: email});
        const findedUserUsername= await userModel.findOne({username: username});
        if(!findedUserEmail && !findedUserUsername){
        const userEntered= new userModel ({
            username: username,
            password: hash,
            email: email,
            list: [],
        });
        const saveRegister= await userEntered.save();
        if(saveRegister){
            const {username, password}= req.body;
        const userWithEmail = await userModel.findOne({username:username})
        if(userWithEmail===null){
            res.send({message:"Failed"})
        }
        else{
        bcrypt.compare(password, userWithEmail.password, function(err, result){
        if(result===true){
            x={id: userWithEmail._id, username: userWithEmail.username};
            console.log(x);
            const jwtToken= jwt.sign(x, process.env.SECRET);
            res.json({token: jwtToken, message: "Succesfully Registered!"})
        }
        else{
            res.send({message:"Failed"})
            console.log(err);
        }
        })}
        }
    }
    else{
        res.send({message: "Username or Email already exists!"})
    }
     })
  })
})
app.get("/logout", function (req, res) {
    res.send("Successfully logged Out");   
});

app.post("/login", async function(req, res, next){
        const {username, password}= req.body;
        const userWithEmail = await userModel.findOne({username:username})
        if(userWithEmail===null){
            res.send({message:"Failed"})
        }
        else{
        bcrypt.compare(password, userWithEmail.password, function(err, result){
        if(result===true){
            x={id: userWithEmail._id, username: userWithEmail.username};
            console.log(x);
            const jwtToken= jwt.sign(x, process.env.SECRET);
            res.json({token: jwtToken, message: "Succesfully Loged!"})
        }
        else{
            res.send({message:"Failed"})
            console.log(err);
        }
        })}
 })

///////////////////////////////////////////END OF THE SING UP AND REGISTER ACTION/////////////////////////////////////////////////////////////

//////////////////////////////////////////START OF THE LIST//////////////////////////////////////////////////////////////////////////////////

app.get("/items", passport.authenticate("jwt", {session:false}), async function(req, res){ 
    const id= req.user;
    console.log(id);
    const findUser= await userModel.findOne({_id:id});
    if(findUser){
        const x= findUser.list
         res.send(x);
    }
    
})

app.get("/delete", passport.authenticate("jwt", {session:false}), async function(req,res){
    const id= req.user.id;
    const findUser= await userModel.findOneAndUpdate({_id:id}, {$set:{list:[]}});
    if(findUser){
        const x= findUser.list
         res.send(x);
    }
})

app.post("/toMark", passport.authenticate("jwt", {session:false}), async function (req,res){
    const mark=req.body.id;
    const id= req.user.id;
    console.log(mark);
    const findUser=await userModel.findOne({_id:id});
    if(findUser){
    let marked= (findUser.list).find(
        function (_item,index){
        return index===mark;
    })
    const {_id, content, clicked}= marked;
    console.log(_id);
    const markIt= await userModel.findOneAndUpdate({_id:id, "list._id":_id}, {$set:{"list.$.clicked":!clicked}})
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
    } }  
})

app.post("/toPost", passport.authenticate("jwt", {session:false}), async function (req,res){
    const inserte=req.body;
    const id= req.user.id;
    const findUser= await userModel.findOne({_id:id});
      (findUser.list).push({...inserte})
    const saveInserted= await findUser.save();
        if(saveInserted){
            res.send("Item sended!")
        }
        else{
            res.send("Failed")
        }
        res.end()
    console.log(req.body);
})

//////////////////////////////////////////END OF THE LIST//////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////START OF THE EVENTS//////////////////////////////////////////////////////////////////////////////////


app.post("/toPostEvent", passport.authenticate("jwt", {session:false}), async function (req,res){
    const inserte=req.body;
    const id= req.user.id;
    const findUser= await userModel.findOne({_id:id});
      (findUser.events).push({...inserte})
    const saveInserted= await findUser.save();
        if(saveInserted){
            res.send("Item sended!")
        }
        else{
            res.send("Failed")
        }
        res.end()
    console.log(req.body);
})

app.get("/events",  passport.authenticate("jwt", {session:false}), async function(req, res){ 
    const id= req.user;
    console.log(id);
    const findUser= await userModel.findOne({_id:id});
    if(findUser){
        const x= findUser.events
         res.send(x);
    }
})

app.post("/deleteEvent",  passport.authenticate("jwt", {session:false}), async function(req,res){
    const mark=req.body.id;
    const id= req.user.id;
    const findedUser=await userModel.findOne({_id:id});
    if(findedUser){
    let marked= (findedUser.events).find(
        function (_item,index){
        return index===mark;
    })
    const {_id}= marked;
    const findUser= await userModel.findOneAndUpdate({_id:id}, {$pull:{events:{_id:_id}}});
    if(findUser){
         res.send("Item eliminated!");
    }
}})

//////////////////////////////////////////END OF THE EVENTS//////////////////////////////////////////////////////////////////////////////////

main().then(() => {
        app.listen(PORT, ()=>{
        console.log("The server is running");
    })
})


