import User from "../models/User.js";

// Get user Data using userId
export const getUserData = async(req, res) => {
     try{
          const {userId} = req.auth();
          const user = await User.findById(userId);

          if(!user){
               return res.json({success: false, message: "User not found"});
          }
          
          return res.json({success: true, user});

     }catch(error){
          console.log(error);
          res.json({success: false , message: error.message});
     }
}