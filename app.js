const THIRTY_MINUTES = 30 * 60 * 1000 //the consensus algorithm runs every 30 minutes
const INITIAL_BALANCE = 50 //this is the initial amount that any node starts with
const STAKE_AMOUNT = 10 //this is the amount that's staked by default to make a proposal
const REWARD_AMOUNT = 15 //you get 5 more Reputation Tokens that what you staked 
const PENALIZED_AMOUNT = 5 //you lose 5 Reputation Tokens if your contribution is not approved by the majority of nodes
const CONSENSUS_THRESHOLD = 0.5 //more than 50% of nodes have to approve your contribution to get the reward

const port = process.env.PORT || 3000
const express = require("express")
const app = express()
const cors = require("cors")
app.use(cors())

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const {
        v4: uuidv4
} = require('uuid')


class Block {
        constructor(proposerId, data) {
                this.proposer = proposerId
                this.data = data
                this.approvals = new Set([proposerId]) //obviously a proposer will approve his own block
                this.blockId = uuidv4() //assigns a unique id to each proposal for tracking later
                console.log(this.approvals)
        }

}

class Blockchain {
        constructor() {
                this.chain = []
                this.nodes = {}
                this.proposalBuffer = []
        }

        stake(block) {
                console.log("inside stake method", block)
                this.nodes[block.proposer].balance -= STAKE_AMOUNT
                this.proposalBuffer.push(block)
        }

        runConsensus() {
                console.log("running consensus algorithm now!")
                this.proposalBuffer.forEach(proposal => {
                        let approvalsCount = proposal.approvals.size
                        let nodesCount = Object.keys(this.nodes).length
                        let approvalRatio = (approvalsCount / nodesCount)
                        console.log("approval ratio: ", approvalRatio)
                        if (approvalRatio > CONSENSUS_THRESHOLD) {
                                this.addBlock(proposal)
                                //now reward the proposer
                                console.log("proposal approved!!", proposal)
                                this.nodes[proposal.proposer] += REWARD_AMOUNT
                        } else {
                                //your block doesn't get added and you get less amounts of token back
                                console.log("proposal rejected!!",proposal)
                                this.nodes[proposal.proposer] += PENALIZED_AMOUNT
                        }
                })

                //now we clear the buffer as it has run its course now
                this.proposalBuffer = []
        }

        addBlock(block) {
                this.chain.push(block)
        }

        addNode(node) {
                if (this.nodes[node.id]) {
                        return false //means another node with same id already exists
                } else {
                        this.nodes[node.id] = node // adding a new node and allocating it the initial balance
                        console.log("new node added", node.id)
                }
        }


}

class Node {
        constructor(id, blockchain) {
                this.id = id
                this.balance = INITIAL_BALANCE
                //now get this node added to blockchain network
                blockchain.addNode(this)
        }

        propose(data) {
                let block = new Block(this.id, data)
                blockchain.stake(block)
                return block.blockId // returns the uuid of proposed block
        }
}

var blockchain = new Blockchain()


app.get("/blockchain", (req, res) => {
        res.status(200).send(blockchain)
})

app.post("/proposeblock", (req, res) => {
        const {
                id,
                data
        } = req.body
        try {
                const blockId = blockchain.nodes[id].propose(data)
                res.status(200).send({
                        blockId
                })
        }
        catch{
             res.status(404).send("user not found")   
        }

})

app.post("/addNode", (req, res) => {
        const {
                id
        } = req.body
        let node = new Node(id, blockchain)
        res.status(200).send("OK")
})

app.post("/approve", (req, res) => {
        const {
                id,
                blockId
        } = req.body
        console.log(req.body)
        console.log(blockchain.proposalBuffer)
        for (proposal of blockchain.proposalBuffer) {
                if (proposal.blockId == blockId) {
                        proposal.approvals.add(id)
                        break;
                }
        }

        console.log(blockchain.proposalBuffer)
        res.status(200).send("OK")
})

app.get("/runconsensus",(req,res)=>{
        blockchain.runConsensus()
})

app.get("/",(req,res)=>{
        res.redirect("/blockchain")
})

app.listen(port, () => {
        console.log(`listening on port ${port}`)

        setInterval(() => {
                // maintains the blockchain periodically by rewarding valuable
                // contributions and penalizing the wrong ones by deducting the staked amount
                blockchain.runConsensus()
        }, THIRTY_MINUTES)
})