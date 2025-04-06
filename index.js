require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser= require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors())
app.use(cookieParser())

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eko35.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const uri = 'mongodb://localhost:27017/'

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // auth related apis
        app.post('/jwt', async(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user,process.env.JWT_SECRET, {expiresIn: '1h'})
            res
            .cookie('token',token,{
                httpOnly: true,
                secure: false
            })
            .send({success:true})
        })

        // jobs related apis 
        const jobsCollection = client.db('jobPortal').collection('jobs')

        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            let query={}
            if(email){
                query={hr_email: email}
            }
            const cursor = jobsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.findOne(query)
            res.send(result)
        })

        app.post('/jobs',async(req,res)=>{
            const newjob = req.body;
            const result = await jobsCollection.insertOne(newjob)
            res.send(result)
        })

        // applicant related apis 
        const applicantCollection = client.db('jobPortal').collection('applicants')

        app.get('/job-application', async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email }
            const result = await applicantCollection.find(query).toArray()

            // aggregate data (not recommended)
            for (const application of result) {
                const id = application.job_id;
                const query1 = { _id: new ObjectId(id) }
                const job = await jobsCollection.findOne(query1)
                if (job) {
                    application.title = job.title,
                        application.location = job.location,
                        application.company = job.company,
                        application.company_logo = job.company_logo
                }
            }
            res.send(result)
        })

        app.post('/job-applicants', async (req, res) => {
            const data = req.body;
            const result = await applicantCollection.insertOne(data)
            res.send(result)
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('job revise server is running')
})

app.listen(port, () => {
    console.log('job server running on port: ', port)
})