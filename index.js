require("dotenv").config();
const express= require("express");
const bodyParser= require("body-parser");
const cors= require("cors");
const mongoose= require("mongoose");
const PORT= process.env.PORT || 4000;
const session= require("express-session");
const passport=require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const schemas= require("./models/schemas");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const passportJwt= require("passport-jwt");
const ExtractJwt= passportJwt.ExtractJwt;
const StrategyJwt= passportJwt.Strategy;

const app= express();

app.use(cookieParser({
    secure: true,  //set to true is required on production with https
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
}))

const corsOptions={
    origin: process.env.CLIENT_UR,
    credentials:true,
    optionSuccessStatus: 200,
    CORS: "AllowAll"
};

app.use(cors(corsOptions));

app.use(passport.initialize());
app.use(passport.session());

const userSchema= new mongoose.Schema({
    username: String,
    password: String,
    email: {type: String, required: true, unique: true },
    list: [schemas.ListSchema],
    events:[schemas.EventSchema]
});

userSchema.plugin(passportLocalMongoose);

const userModel= new mongoose.model("users", userSchema);

passport.use(
    new StrategyJwt(
        {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req)=>{
                    return req.cookies["_auth"];
                },
            ]),
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
passport.use(userModel.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});
 

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
    console.log(req.session);
    const userEntered= {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        list: [],
    }
    userModel.register(new userModel(userEntered), req.body.password, function(err, user){
    if(err){
        res.send({message:"Please try with another email or username."})
    } else{
        passport.authenticate("local")(req, res, function(){
        res.send({message:"User information registered! Go back and Log In now!"});    
        })
    }

    })
})
app.get("/logout", function (req, res) {
    req.session.passport= null;
    req.session.save(function(err){
        if(err) next(err)
        req.session.regenerate(function(err){
            if(err) next(err)
            req.logOut(function(err){
                if(err){
                    console.log(err);
                } else{
                    res.send("Successfully logged Out")
                }
            });
        })
    })
});

app.post("/login", passport.authenticate("local", {failureMessage:true}), async function(req, res){
        const {username, password}= req.body;
        const userWithEmail = await userModel.findOne({username:username})
        x={id: userWithEmail._id, username: userWithEmail.username};
        console.log(x);
        const jwtToken= jwt.sign(x, process.env.SECRET);
        res.json({token: jwtToken, message: "Succesfully Loged!"})
})

///////////////////////////////////////////END OF THE SING UP AND REGISTER ACTION/////////////////////////////////////////////////////////////

//////////////////////////////////////////START OF THE LIST//////////////////////////////////////////////////////////////////////////////////

app.get("/items",  passport.authenticate("jwt", {session:false}), async function(req, res){ 
    const id= req.user;
    console.log(id);
    const findUser= await userModel.findOne({_id:id});
    if(findUser){
        const x= findUser.list
         res.send(x);
    }
})

app.get("/delete",  passport.authenticate("jwt", {session:false}), async function(req,res){
    const id= req.user;
    const findUser= await userModel.findOneAndUpdate({_id:id}, {$set:{list:[]}});
    if(findUser){
        const x= findUser.list
         res.send(x);
    }
})

app.post("/toMark", async(req,res)=>{
    const mark=req.body.id;
    const id= req.user;
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

app.post("/toPost", passport.authenticate("jwt", {session:false}), async (req,res)=>{
    const inserte=req.body;
    const id= req.user;
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


app.post("/toPostEvent", passport.authenticate("jwt", {session:false}), async (req,res)=>{
    const inserte=req.body;
    const id= req.user;
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
    const id= req.user;
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


