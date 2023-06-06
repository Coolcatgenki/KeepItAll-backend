const mongoose= require("mongoose");

const listSchema= new mongoose.Schema({
    content: String,
    clicked: Boolean
});

const List= new mongoose.model("inserted", listSchema);

const eventSchema= new mongoose.Schema({
    title: String,
    content: String,
    date: String
});

const Event= new mongoose.model("event", eventSchema);

const mySchemas={ "List": List, "ListSchema": listSchema, "EventSchema": eventSchema, "EventModel": Event};


module.exports= mySchemas;