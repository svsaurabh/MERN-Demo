const express = require('express');
const router = express.Router();
const request = require('request');
const config = require('config');
const middleware = require('../../middleware/auth');
const { check,validationResult } = require('express-validator');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Post');

//@route   Get api/profile/me
//@desc    Get current user's profile
//@access  Private
router.get('/me',middleware,async (req,res)=>{
    try{
        const profile = await Profile.findOne({user: req.user.id}).populate(
            'user',
            ['name','avatar']
        );

        if (!profile){
            return res.status(400).json({ msg: 'There is no profile for this user'});
        }

        res.json(profile);
    }catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

//@route   Post api/profile
//@desc    Create/Update user's profile
//@access  Private
router.post('/',[middleware, [
        check('status','Status is required')
            .not()
            .isEmpty(),
        check('skills','Skills is required')
            .not()
            .isEmpty()
        ]
    ],
    async (req,res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin
        } = req.body;

        // Buid Profile Objects
        const profileFields = {};
        profileFields.user = req.user.id;
        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (bio) profileFields.bio = bio;
        if (status) profileFields.status = status;
        if (githubusername) profileFields.githubusername = githubusername;
        if (skills) {
            profileFields.skills = skills.split(',').map(skill => skill.trim());
        }

        //Build Social Object
        profileFields.social = {}
        if (youtube) profileFields.social.youtube = youtube;
        if (facebook) profileFields.social.facebook = facebook;
        if (twitter) profileFields.social.twitter = twitter;
        if (linkedin) profileFields.social.linkedin = linkedin;
        if (instagram) profileFields.social.instagram = instagram;

        try {
            let profile = await Profile.findOne({user: req.user.id});

            if(profile){
                //update
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id}, 
                    {$set: profileFields},
                    {new: true}
                );
                return res.send(profile);
            }

            //Create
            profile = new Profile(profileFields);
            await profile.save();
            return res.json(profile);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server Error');
        }
        
    }
);

//@route   Get api/profile
//@desc    Get all profile
//@access  Public
router.get('/', async (req,res)=>{
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar']);
        res.json(profiles);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
})


//@route   Get api/profile/user/:user_id
//@desc    Get profile by user id
//@access  Public
router.get('/user/:user_id', async (req,res)=>{
    try {
        const profile = await Profile.findOne({user: req.params.user_id})
        .populate('user', ['name', 'avatar']);
        if(!profile) return res.status(400).json({msg: 'Profile not Found'});

        res.json(profile);
    } catch (error) {
        console.error(error.message);
        if(error.kind == 'ObjectId'){
            return res.status(400).json({msg: 'Profile not Found'});
        }
        res.status(500).send('Server Error');
    }
})

//@route   Delete api/profile
//@desc    Delete profile, user & post
//@access  Private
router.delete('/', middleware, async (req,res)=>{
    try {
        //Remove users posts
        await Post.deleteMany({ user: req.user.id });

        //Remove profile
        await Profile.findOneAndRemove({user: req.user.id});

        //Remove User
        await User.findOneAndRemove({_id: req.user.id});

        res.json({msg: 'User Deleted'});
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
})

//@route   Put api/profile/experience
//@desc    Add profile experience
//@access  Private
router.put('/experience',[
        middleware,[
            check('title', 'Title is required')
                .not()
                .isEmpty(),
            check('company', 'Company is required')
                .not()
                .isEmpty(),
            check('from', 'From date is required')
                .not()
                .isEmpty(),
            check('description', 'Description is required')
                .not()
                .isEmpty(),
        ]
    ], async (req,res)=>{
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors: errors.array() });
        }
        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description
        } = req.body;

        const newExp = {
            title,
            company,
            location,
            from,
            to,
            current,
            description
        }

        try {
            const profile = await Profile.findOne({ user: req.user.id });
            profile.experience.unshift(newExp);
            await profile.save();
            res.json(profile);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server Error');
        }
    });

//@route   Put api/profile/experience/:experience_id
//@desc    Delete profile experience
//@access  Private
router.delete('/experience/:experience_id', middleware, async (req,res) =>{
    try {
        const profile = await Profile.findOne({user: req.user.id});

        //Get remove index
        const removeIndex = profile.experience
        .map(item=> item.id)
        .indexOf(req.params.id);

        profile.experience.splice(removeIndex,1);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//@route   Put api/profile/education
//@desc    Add profile education
//@access  Private
router.put('/education',[
    middleware,[
        check('school', 'School is required')
            .not()
            .isEmpty(),
        check('degree', 'Degree is required')
            .not()
            .isEmpty(),
        check('fieldofstudy', 'Field of study is required')
            .not()
            .isEmpty(),
        check('from', 'From date is required')
            .not()
            .isEmpty(),
    ]
], async (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array() });
    }
    const {
        school,
        fieldofstudy,
        degree,
        from,
        to,
        current,
        description
    } = req.body;

    const newEdu = {
        school,
        fieldofstudy,
        degree,
        from,
        to,
        current,
        description
    }

    try {
        const profile = await Profile.findOne({ user: req.user.id });
        profile.education.unshift(newEdu);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//@route   Put api/profile/education/:education_id
//@desc    Delete profile education
//@access  Private
router.delete('/education/:education_id', middleware, async (req,res) =>{
    try {
        const profile = await Profile.findOne({user: req.user.id});

        //Get remove index
        const removeIndex = profile.education
        .map(item=> item.id)
        .indexOf(req.params.id);

        profile.education.splice(removeIndex,1);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//@route   Get api/profile/github/:username
//@desc    Get user repo from Github
//@access  Public
router.get('/github/:username', (req,res)=>{
    try {
        const options = {
            uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&
            sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${
            config.get('githubSecret')}`,
            method: 'GET',
            headers: {'user-agent': 'node.js'}
        }
        request(options, (error,response, body)=>{
            if (error) console.error(error);

            if (response.statusCode !== 200){
                return res.status(400).json({ msg: 'No Github profile found' });
            }

            res.json(JSON.parse(body));
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;