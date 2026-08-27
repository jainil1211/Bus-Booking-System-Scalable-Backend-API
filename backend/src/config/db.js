const  mongoose=require("mongoose");

const connectDB=async ()=>{
    try{
        await  mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB database Connected  sucessfully");

    }catch(error){
        console.log("mongoDB  connection  Failed: ",error.message);
        process.exit(1);
    }
}

module.exports=connectDB;
