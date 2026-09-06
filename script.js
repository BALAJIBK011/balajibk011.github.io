const nav=document.getElementById("nav"),menuBtn=document.getElementById("menuBtn");
menuBtn?.addEventListener("click",()=>nav.classList.toggle("open"));
document.querySelectorAll(".nav a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));

const sections=[...document.querySelectorAll("main section[id]")];
const navLinks=[...document.querySelectorAll(".nav a")];
function updateActive(){
  let current="home";
  sections.forEach(s=>{if(scrollY>=s.offsetTop-140) current=s.id});
  navLinks.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+current));
}
window.addEventListener("scroll",()=>{
  updateActive();
  const max=document.documentElement.scrollHeight-innerHeight;
  document.getElementById("scrollProgress").style.width=(max?scrollY/max*100:0)+"%";
  document.getElementById("toTop").classList.toggle("show",scrollY>500);
},{passive:true});

document.getElementById("toTop").addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));

const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")});
},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

const themeBtn=document.getElementById("themeBtn");
const saved=localStorage.getItem("bbk-theme");
if(saved==="dark") document.body.classList.add("dark");
themeBtn.addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("bbk-theme",document.body.classList.contains("dark")?"dark":"light");
});
document.getElementById("year").textContent=new Date().getFullYear();
updateActive();
