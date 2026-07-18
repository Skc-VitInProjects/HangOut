import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
     user: {type: String, ref: 'User', required: true},
     content: {type: String},
     media_url: {type: String},
     media_type: {type: String, enum: ['text', 'image', 'video']},
     views_count: [{type: String, ref: 'User'}],
     background_color: {type: String},
     expiresAt: {type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)},
     
     }, {timestamps: true, minimize: false})

storySchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
storySchema.index({user: 1, createdAt: -1});

const Story = mongoose.model('Story', storySchema)

export default Story;
