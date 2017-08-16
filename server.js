'use strict';

const port = process.env.PORT || 3000;

const express    = require( "express" );
const bodyparser = require( "body-parser" );
const exphbs     = require( "express-handlebars" );
const mongoose   = require( "mongoose" );
mongoose.Promise = require( 'bluebird' );
const cheerio    = require( "cheerio" );
const request    = require( "request" );

const app = express();

app.use(bodyparser.urlencoded( { extended: true } ));

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

mongoose.connect('mongodb://localhost/newsflash', { useMongoClient: true });

var Item = mongoose.model('Item', { 
    title: String, 
    link: String,
    comment: String
});

app.get( "/", function( req, res ) {
    Item.find({}, function( err, itemList) {
        if ( err ) throw err;
        //console.log( "itemList:", itemList );
        res.render( "list", {
            data: itemList
        })
    });
});

app.get( "/getnews", function( req, res ) {
    console.log( "Scraping articles." );

    Item.remove({}, function(err, removed) {
        console.log( "Items removed = " + removed );
        const statusCode = getNewArticles();
        res.json( { status: statusCode } ); 
    })   
});

app.post( "/addcmt", function( req, res ) {
    console.log( "adding comment: ", req.body );
    const id = req.body.id;
    const comment = req.body.comment;
    console.log( "COMMENT: ", comment );
    
    Item.findById( id, function( err, item ) {
        item.comment = comment;
        item.save( function(err) {
            if ( err ) throw err;
            res.json( item );            
        });
    });

});

app.post( "/delcmt", function( req, res ) {
    console.log( "deleting comment: ", req.body );
    const id = req.body.id;
    Item.findById( id, function( err, item ) {
        item.comment = null;
        item.save( function(err) {
            if ( err ) throw err;
            res.json( item );            
        });
    });
});

app.listen( port, function( ) {
    console.log( "Listening on " + port );
});


function getNewArticles() {

    request("https://news.ycombinator.com/", function(error, response, html) {
        console.log( response.statusCode );

        const $ = cheerio.load( html );

        $(".title").each( function( i, entry ) {
            const title = $(this).children("a").text();
            if ( title ) {;
                // console.log( title );
                const link = $(this).children("a").attr("href");
                //console.log( link );
                const item = new Item( { title: title, link: link } );
                item.save( function(err) {
                    if ( err ) throw err;
                    //console.log( item );
                });
            }
        });
        return( response.statusCode );
    });
}