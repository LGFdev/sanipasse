function getTicketHtml(
    name: String = "",
    date_of_birth: String = ""
  ): String{
  const header: String = localStorage.getItem("header");
  const footer: String = localStorage.getItem("footer");
  let html: String = `
<style type="text/css">
  body{
    width: 90mm;
  }
  p{
    padding: 0;
    margin: 1mm;
  }
  input{
    border: none;
    border-bottom: 0.5mm dotted black;
    width: 50mm;
  }
  article{
    margin: 2mm 0;
  }
  header pre,
  footer pre{
    text-align: center;
  }
</style>

<body>
  `;
  if(undefined != header){
    html = html.concat(
      `<header><pre>`,
      header,
      `</pre></header>`
    )
  }
  html = html.concat(`
  <article>
    <p>👤 `,name,`</p>
    <p>🎂 Né(e) le `,date_of_birth,`</p>
    <p>📱 Tél: <input></p>
    <p>✓ Vérifié le `,new Date().toLocaleString('fr-FR'),`</p>
  </article>
  `)
  if(undefined != footer){
    html = html.concat(
      `<footer><pre>`,
      footer,
      `</pre></footer>`
    )
  }
  html = html.concat(`
</body>
` )
  return html;
}

export async function printTicket(
    name: String = "",
    date_of_birth: String = ""
  ){
  const printingWindow = window.open("about:blank", 'Printing', 'width=350,height=300');
  printingWindow.onload = ()=>{
    printingWindow.document.title = "Sanipasse impression"
    printingWindow.document.body.innerHTML = getTicketHtml(name, date_of_birth);
  	printingWindow.print();
  	printingWindow.close();
  }
}