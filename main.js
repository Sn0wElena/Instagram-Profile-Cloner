const fs = require('fs');

let {
  igApi,
  getCookie
} = require("insta-fetcher");
const https = require('https');

let ig


const usernames = JSON.parse(fs.readFileSync('usernames.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('confs.json', 'utf8'));

async function main() {

  const session_id = await getCookie(config.username, config.passwsord);

  ig = new igApi(session_id);

  for (const username of usernames) {
    await downloadProfile(username);
  }
}

async function downloadProfile(username) {
  console.log(`Downloading profile ${username}`);
  try {
    //const profile = await ig.fetchUser(username);
    // create an empty folder for the profile
    fs.mkdirSync(`./${username}`, {
      recursive: true
    });

    // download all post
    let posts = await ig.fetchUserPostsV2(username);
    //fs.writeFileSync(`./${username}/posts.json`, JSON.stringify(posts, null, 2));

    while (posts.page_info.has_next_page) {
      // download all posts
      for (const post of posts.edges) {

        let p = []

        if(post.node.edge_sidecar_to_children != undefined) {
          for (const child of post.node.edge_sidecar_to_children.edges) {
            if(child.node.is_video){
              p.push(child.node.video_url)
            }
            p.push(child.node.display_url)
          }
        } else {
          if(post.node.is_video){
            p.push(post.node.video_url)
          }
          p.push(post.node.display_url)
        }

        for(let kk = 0; kk < p.length; kk++) {
          const image = p[kk];

          // get the file name
          let filename = image.includes(".mp4") ? `${post.node.id}.mp4` : `${post.node.id}.jpg`;

          if(p.length > 1) {
            filename = filename.replace('.', `_${kk}.`)
          }

          // check if file already exists
          try {
            fs.accessSync(`./${username}/${filename}`);
            console.log(`File ${filename} already exists.`);
            console.log(`Skipping ${username}`);
            return;
          } catch (error) {}

          try {
            // download the image with fs.createWriteStream
            const f = fs.createWriteStream(`./${username}/${filename}`);
            https.get(image, (response) => {
              response.pipe(f);
            })
            console.log(`Downloaded ${username} -- ${filename}`);
          } catch (error) {}
          
        }

      }
      // get the next page
      try {
        posts = await ig.fetchUserPostsV2(username, posts.page_info.end_cursor);
      } catch (error) {}
    }

    console.log(`Profile ${username} downloaded successfully.`);
  } catch (error) {
    console.error(`Error downloading profile ${username}: ${error.message}`);
  }
}


main();