import http from 'node:http';
let correos=[],fallar=false;
http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);res.setHeader('content-type','application/json');
 if(req.url==='/reset'){correos=[];fallar=false;return res.end('{}');}
 if(req.url==='/fallar'){fallar=true;return res.end('{}');}
 if(req.url==='/correos')return res.end(JSON.stringify(correos));
 if(req.url==='/brevo'){if(fallar){res.statusCode=503;return res.end('{}');}correos.push(JSON.parse(Buffer.concat(chunks).toString()));return res.end(JSON.stringify({messageId:'test-'+correos.length}));}
 res.end('{}');
}).listen(3151,'127.0.0.1');
