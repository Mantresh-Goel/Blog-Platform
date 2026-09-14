const $ = id => document.getElementById(id);
const authDialog = $('authDialog'), postDialog = $('postDialog'), viewDialog = $('postViewDialog');
let authMode = 'login';
let token = localStorage.getItem('blog_token');
let currentUser = JSON.parse(localStorage.getItem('blog_user') || 'null');

function showMessage(text, error=false){ const el=$('message'); el.textContent=text; el.className='message'+(error?' error':''); setTimeout(()=>el.classList.add('hidden'),3500); }
function api(path, options={}){ options.headers={...(options.headers||{}),'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}; return fetch('/api'+path, options).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}); }
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function updateNav(){ $('userLabel').textContent=currentUser?`Hi, ${currentUser.name}`:''; $('loginBtn').classList.toggle('hidden',!!currentUser); $('registerBtn').classList.toggle('hidden',!!currentUser); $('logoutBtn').classList.toggle('hidden',!currentUser); }

async function loadPosts(){
  const posts=await api('/posts');
  const box=$('posts');
  if(!posts.length){box.innerHTML='<div class="empty"><h3>No posts yet</h3><p>Be the first person to publish a post.</p></div>';return;}
  box.innerHTML=posts.map(p=>`<article class="post-card"><div class="meta">${escapeHtml(p.author_name)} · ${new Date(p.created_at+'Z').toLocaleDateString()}</div><h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(p.content)}</p><div class="card-footer"><button class="read" onclick="viewPost(${p.id})">Read & comments →</button>${currentUser&&currentUser.id===p.author_id?`<div class="manage"><button class="icon-btn" onclick="editPost(${p.id})">Edit</button><button class="icon-btn" onclick="deletePost(${p.id})">Delete</button></div>`:''}</div></article>`).join('');
}

async function viewPost(id){
  try{const {post,comments}=await api('/posts/'+id);$('postView').innerHTML=`<div class="meta">By ${escapeHtml(post.author_name)} · ${new Date(post.created_at+'Z').toLocaleString()}</div><h1>${escapeHtml(post.title)}</h1><div class="article-content">${escapeHtml(post.content)}</div><div class="comments"><h3>Comments (${comments.length})</h3>${comments.length?comments.map(c=>`<div class="comment"><strong>${escapeHtml(c.author_name)}</strong><span class="meta"> · ${new Date(c.created_at+'Z').toLocaleString()}</span><p>${escapeHtml(c.content)}</p>${currentUser&&currentUser.id===c.author_id?`<button class="read" onclick="editComment(${c.id}, ${id})">Edit</button> <button class="read" onclick="deleteComment(${c.id}, ${id})">Delete</button>`:''}</div>`).join(''):'<p class="meta">No comments yet.</p>'}${currentUser?`<form class="comment-form" onsubmit="addComment(event,${id})"><input id="commentInput" placeholder="Write a comment..." maxlength="1000" required><button class="btn primary">Post</button></form>`:'<p class="meta">Login to join the discussion.</p>'}</div>`;viewDialog.showModal();}catch(e){showMessage(e.message,true)}
}
window.viewPost=viewPost;

$('loginBtn').onclick=()=>openAuth('login'); $('registerBtn').onclick=()=>openAuth('register');
$('logoutBtn').onclick=()=>{localStorage.clear();token=null;currentUser=null;updateNav();loadPosts();showMessage('Logged out successfully.');};
$('authClose').onclick=()=>authDialog.close(); $('postClose').onclick=()=>postDialog.close(); $('viewClose').onclick=()=>viewDialog.close();
$('switchAuth').onclick=()=>openAuth(authMode==='login'?'register':'login');
function openAuth(mode){authMode=mode;$('authTitle').textContent=mode==='login'?'Login':'Create account';$('authSubmit').textContent=mode==='login'?'Login':'Register';$('nameField').classList.toggle('hidden',mode==='login');$('authSwitch').innerHTML=mode==='login'?`Don't have an account? <button type="button" id="switchAuth">Register</button>`:`Already have an account? <button type="button" id="switchAuth">Login</button>`;$('switchAuth').onclick=()=>openAuth(mode==='login'?'register':'login');authDialog.showModal();}

$('authForm').onsubmit=async e=>{e.preventDefault();try{const payload={email:$('authEmail').value,password:$('authPassword').value};if(authMode==='register')payload.name=$('authName').value;const d=await api('/auth/'+authMode,{method:'POST',body:JSON.stringify(payload)});token=d.token;currentUser=d.user;localStorage.setItem('blog_token',token);localStorage.setItem('blog_user',JSON.stringify(currentUser));authDialog.close();$('authForm').reset();updateNav();loadPosts();showMessage(authMode==='login'?'Welcome back!':'Account created successfully!');}catch(e){showMessage(e.message,true)}};

$('newPostBtn').onclick=()=>{if(!currentUser){openAuth('login');return} $('postDialogTitle').textContent='Create Post';$('postId').value='';$('postTitle').value='';$('postContent').value='';postDialog.showModal();};
$('postForm').onsubmit=async e=>{e.preventDefault();try{const id=$('postId').value;const method=id?'PUT':'POST';const path=id?'/posts/'+id:'/posts';await api(path,{method,body:JSON.stringify({title:$('postTitle').value,content:$('postContent').value})});postDialog.close();loadPosts();showMessage(id?'Post updated!':'Post published!');}catch(e){showMessage(e.message,true)}};

async function editPost(id){try{const d=await api('/posts/'+id);$('postDialogTitle').textContent='Edit Post';$('postId').value=d.post.id;$('postTitle').value=d.post.title;$('postContent').value=d.post.content;postDialog.showModal();}catch(e){showMessage(e.message,true)}}
window.editPost=editPost;
async function deletePost(id){if(!confirm('Delete this post and its comments?'))return;try{await api('/posts/'+id,{method:'DELETE'});loadPosts();showMessage('Post deleted.');}catch(e){showMessage(e.message,true)}}
window.deletePost=deletePost;
async function addComment(e,id){e.preventDefault();try{const input=$('commentInput');await api('/posts/'+id+'/comments',{method:'POST',body:JSON.stringify({content:input.value})});viewPost(id);loadPosts();}catch(e){showMessage(e.message,true)}}
window.addComment=addComment;
async function editComment(commentId,postId){const content=prompt('Edit comment:');if(!content?.trim())return;try{await api('/comments/'+commentId,{method:'PUT',body:JSON.stringify({content})});viewPost(postId);}catch(e){showMessage(e.message,true)}}
window.editComment=editComment;
async function deleteComment(commentId,postId){if(!confirm('Delete this comment?'))return;try{await api('/comments/'+commentId,{method:'DELETE'});viewPost(postId);}catch(e){showMessage(e.message,true)}}
window.deleteComment=deleteComment;

(async()=>{updateNav();try{if(token){const d=await api('/auth/me');currentUser=d.user;localStorage.setItem('blog_user',JSON.stringify(currentUser));}}catch{localStorage.clear();token=null;currentUser=null;updateNav()}try{await loadPosts()}catch(e){showMessage(e.message,true)}})();
