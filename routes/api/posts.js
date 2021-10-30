const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const middleware = require('../../middleware/auth');

//@route   Post api/posts
//@desc    Ceate a Post
//@access  Private
router.post('/', [middleware, [
        check('text','Text is Required')
            .not()
            .isEmpty()
    ]],
    async (req,res)=>{
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors: errors.array()});
        }

        try {
            const user = await User.findById(req.user.id).select('-password');

            const newPost = new Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            });

            const post = newPost.save();
            res.json(newPost);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server Error');
        }
    }
);

//@route   Get api/posts
//@desc    Get all Post
//@access  Private
router.get('/', middleware, async (req,res) => {
    try {
        const post = await Post.find().sort({date: 1});
        res.json(post);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Sever Error');
    }
});

//@route   Get api/posts/:id
//@desc    Get post by id
//@access  Private
router.get('/:id', middleware, async (req,res) => {
    try {
        const post = await Post.findById(req.params.id);
        if(!post){
            return res.status(404).json({msg: 'Post Not found'});
        }
        res.json(post);
    } catch (error) {
        console.error(error.message);
        if(error.kind === 'ObjectId'){
            return res.status(404).json({msg: 'Post Not found'});
        }
        res.status(500).send('Sever Error');
    }
});

//@route   DELETE api/posts/:id
//@desc    Delete post by id
//@access  Private
router.delete('/:id', middleware, async (req,res) => {
    try {
        const post = await Post.findById(req.params.id);

        if(!post){
            return res.status(404).json({msg: 'Post Not found'});
        }

        if(post.user.toString() !== req.user.id){
            return res.status(401).send('User not Authorized');
        }
        await post.remove();
        res.json({msg: 'Post Removed'});
    } catch (error) {
        console.error(error.message);
        if(error.kind === 'ObjectId'){
            return res.status(404).json({msg: 'Post Not found'});
        }
        res.status(500).send('Sever Error');
    }
});

//@route   PUT api/posts/like/:id
//@desc    Like post by id
//@access  Private
router.put('/like/:id', middleware, async (req,res) =>{
    try {
        const post = await Post.findById(req.params.id);

        //Check if post alredy liked by same user
        if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0){
            return res.status(400).json({msg: 'Post already liked'});
        }
        post.likes.unshift({ user: req.user.id});
        await post.save();
        res.json(post.likes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//@route   PUT api/posts/unlike/:id
//@desc    Unlike post by id
//@access  Private
router.put('/unlike/:id', middleware, async (req,res) =>{
    try {
        const post = await Post.findById(req.params.id);

        //Check if post alredy liked by same user
        if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0){
            return res.status(400).json({msg: 'Post not yet liked'});
        }
        const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);
        post.likes.splice(removeIndex,1);
        await post.save();
        res.json(post.likes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//@route   POST api/posts/comment/:id
//@desc    Comment post by id
//@access  Private
router.post('/comment/:id', [middleware,[
    check('text','Text is Required')
            .not()
            .isEmpty()
    ]],
    async (req,res)=>{
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors: errors.array()});
        }

        try {
            const user = await User.findById(req.user.id).select('-password');
            const post = await Post.findById(req.params.id);

            const newComment = {
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            };

            post.comments.unshift(newComment);

        await post.save();
        res.json(post.comments);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//@route   DELETE api/posts/comment/:id/:comment_id
//@desc    DELETE comment by post & comment id
//@access  Private
router.delete('/comment/:id/:comment_id', middleware, async (req,res) =>{
    try {
        const post = await Post.findById(req.params.id);
        const comment = post.comments.find(
            comment => comment.id === req.params.comment_id
        );

        if(!comment){
            return res.status(404).json({msg: 'Comment does not exist'});
        }

        if(comment.user.toString() !== req.user.id){
            return res.status(401).json({msg: 'User not authorized'});
        }

        const removeIndex = post.comments.map(comment => comment.user.toString()).indexOf(req.user.id);
        post.comments.splice(removeIndex,1);
        await post.save();
        res.json(post.comments);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;