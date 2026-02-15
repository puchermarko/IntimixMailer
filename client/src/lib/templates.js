export const emailTemplates = [
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    description: 'Confirm a customer order with details',
    category: 'Orders',
    subject: 'Rendelés visszaigazolás - #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  @media (max-width:660px) {
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table style="background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Rendel&eacute;s visszaigazol&aacute;s</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:28px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">Rendel&eacute;s #{{order_id}}</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>K&ouml;sz&ouml;nj&uuml;k a rendel&eacute;s&eacute;t! Az al&aacute;bbi rendel&eacute;s&eacute;t sikeresen r&ouml;gz&iacute;tett&uuml;k.</p>
            <p>Amint a csomagja felad&aacute;sra ker&uuml;l, &eacute;rtes&iacute;tj&uuml;k &Ouml;nt a nyomk&ouml;vet&eacute;si sz&aacute;mmal.</p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'shipping-notification',
    name: 'Shipping Notification',
    description: 'Notify customer their order has been shipped',
    category: 'Shipping',
    subject: 'Csomagja feladásra került - #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  @media (max-width:660px) {
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table style="background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Sz&aacute;ll&iacute;t&aacute;si &eacute;rtes&iacute;t&eacute;s</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:28px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">Rendel&eacute;s #{{order_id}}</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>&Ouml;r&ouml;mmel &eacute;rtes&iacute;tj&uuml;k, hogy a rendel&eacute;se felad&aacute;sra ker&uuml;lt!</p>
            <p>📦 <strong>Nyomk&ouml;vet&eacute;si sz&aacute;m:</strong> {{tracking_number}}</p>
            <p>A csomag v&aacute;rhat&oacute;an 1-3 munkanapon bel&uuml;l meg&eacute;rkezik. A csomagol&aacute;s diszkr&eacute;t, nem utal a tartalm&aacute;ra.</p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Welcome a new customer to the shop',
    category: 'Marketing',
    subject: 'Üdvözöljük az Intimix Shopban!',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  @media (max-width:660px) {
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table style="background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>&Uuml;dv&ouml;z&ouml;lj&uuml;k!</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:22px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">K&ouml;sz&ouml;ntj&uuml;k az Intimix Shop csal&aacute;dj&aacute;ban</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>K&ouml;sz&ouml;nj&uuml;k, hogy regisztr&aacute;lt az Intimix Shopban! N&aacute;lunk megtal&aacute;lja a legjobb minős&eacute;gű term&eacute;keket, diszkr&eacute;t csomagol&aacute;ssal &eacute;s gyors sz&aacute;ll&iacute;t&aacute;ssal.</p>
            <p style="margin:25px 0;"><a href="https://intimix.hu" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1aa19c;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">B&ouml;ng&eacute;sszen term&eacute;keink k&ouml;z&ouml;tt</a></p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'payment-received',
    name: 'Payment Received',
    description: 'Confirm payment has been received',
    category: 'Orders',
    subject: 'Fizetés megerősítve - #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  @media (max-width:660px) {
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table style="background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Fizet&eacute;s megerős&iacute;tve</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:28px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">Rendel&eacute;s #{{order_id}}</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>Ez&uacute;ton &eacute;rtes&iacute;tj&uuml;k, hogy a fizet&eacute;s&eacute;t sikeresen megkaptuk.</p>
            <p>&#10003; <strong>Fizet&eacute;s sikeres</strong></p>
            <p>Rendel&eacute;s&eacute;t hamarosan feldolgozzuk &eacute;s sz&aacute;ll&iacute;tjuk.</p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'package-shipped-foxpost',
    name: 'Package Shipped (FoxPost)',
    description: 'Notify customer their package is on the way with FoxPost tracking link',
    category: 'Shipping',
    subject: 'Csomagja úton van - Rendelés #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  .desktop_hide, .desktop_hide table { mso-hide: all; display: none; max-height: 0px; overflow: hidden; }
  .image_block img+div { display: none; }
  sup, sub { font-size: 75%; line-height: 0; }
  @media (max-width:660px) {
    .desktop_hide table.icons-inner { display: inline-block !important; }
    .icons-inner { text-align: center; }
    .icons-inner td { margin: 0 auto; }
    .mobile_hide { display: none; }
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
    .mobile_hide { min-height: 0; max-height: 0; max-width: 0; overflow: hidden; font-size: 0px; }
    .desktop_hide, .desktop_hide table { display: table !important; max-height: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table class="nl-container" style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Csomagja &uacute;ton van</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:28px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">Rendel&eacute;s #{{order_id}}</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>&Ouml;r&ouml;mmel &eacute;rtes&iacute;tj&uuml;k, hogy rendel&eacute;s&eacute;t elk&uuml;ldt&uuml;k, a csomagot a fut&aacute;rszolg&aacute;lat hamarosan &aacute;tveszi &eacute;s k&eacute;zbes&iacute;ti &Ouml;nnek.</p>
            <p>📦 <strong>Csomagsz&aacute;m:</strong> {{tracking_number}}<br />🔗 <strong>K&ouml;vet&eacute;si link:</strong> <a href="{{tracking_url}}" target="_blank" rel="noopener noreferrer">Csomag k&ouml;vet&eacute;se</a></p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <!-- Teal line -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>

      <!-- Footer logo -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>

      <!-- Disclaimer -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Divider -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Copyright -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'invoice-proforma',
    name: 'Invoice / Díjbekérő',
    description: 'Send proforma invoice with PDF attachment after order placement',
    category: 'Orders',
    subject: 'Díjbekérő - Rendelés #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  .desktop_hide, .desktop_hide table { mso-hide: all; display: none; max-height: 0px; overflow: hidden; }
  .image_block img+div { display: none; }
  sup, sub { font-size: 75%; line-height: 0; }
  @media (max-width:660px) {
    .desktop_hide table.icons-inner { display: inline-block !important; }
    .icons-inner { text-align: center; }
    .icons-inner td { margin: 0 auto; }
    .mobile_hide { display: none; }
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
    .mobile_hide { min-height: 0; max-height: 0; max-width: 0; overflow: hidden; font-size: 0px; }
    .desktop_hide, .desktop_hide table { display: table !important; max-height: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table class="nl-container" style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo (PNG version) -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Rendel&eacute;s #{{order_id}}</strong></span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Ubuntu,Cantarell,'Noto Sans',sans-serif;font-size:16px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Tisztelt <strong>{{name}}</strong>!</p>
            <p>K&ouml;sz&ouml;nj&uuml;k megrendel&eacute;s&eacute;t. Mell&eacute;kelten k&uuml;ldj&uuml;k d&iacute;jbek&eacute;rőnket a rendel&eacute;s&eacute;vel kapcsolatban.</p>
            <ul style="text-align:left;display:inline-block;">
              <li>Amint meg&eacute;rkezik a befizet&eacute;s sz&aacute;ml&aacute;nkra, megkezdj&uuml;k a csomagol&aacute;st &eacute;s feladjuk a term&eacute;ket. A befizet&eacute;sről &eacute;rtes&iacute;t&eacute;st k&uuml;ld&uuml;nk.</li>
            </ul>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se van vagy seg&iacute;ts&eacute;gre van sz&uuml;ks&eacute;ge, k&eacute;rem, vegye fel vel&uuml;nk a kapcsolatot.</p>
            <p>&Uuml;dv&ouml;zlettel,<br />Intimix Web&aacute;ruh&aacute;z<br />&Uuml;gyf&eacute;lszolg&aacute;lat</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <!-- Teal line -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>

      <!-- Footer logo -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>

      <!-- Disclaimer -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Divider -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Copyright -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'invoice-receipt',
    name: 'Számla (Invoice)',
    description: 'Send the final invoice/receipt PDF to the customer after purchase',
    category: 'Orders',
    subject: 'Számla - Intimix.hu',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  .desktop_hide, .desktop_hide table { mso-hide: all; display: none; max-height: 0px; overflow: hidden; }
  .image_block img+div { display: none; }
  sup, sub { font-size: 75%; line-height: 0; }
  @media (max-width:660px) {
    .desktop_hide table.icons-inner { display: inline-block !important; }
    .icons-inner { text-align: center; }
    .icons-inner td { margin: 0 auto; }
    .mobile_hide { display: none; }
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
    .mobile_hide { min-height: 0; max-height: 0; max-width: 0; overflow: hidden; font-size: 0px; }
    .desktop_hide, .desktop_hide table { display: table !important; max-height: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table class="nl-container" style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo (PNG version) -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Sz&aacute;mla</strong></span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>K&ouml;sz&ouml;nj&uuml;k, hogy az Intimix.hu web&aacute;ruh&aacute;zban v&aacute;s&aacute;rolt!<br />Ez&uacute;ton k&uuml;ldj&uuml;k &Ouml;nnek a v&aacute;s&aacute;rl&aacute;s&aacute;r&oacute;l k&eacute;sz&uuml;lt sz&aacute;ml&aacute;t csatolt f&aacute;jl form&aacute;j&aacute;ban.</p>
            <p>Amennyiben b&aacute;rmilyen k&eacute;rd&eacute;se mer&uuml;lne fel a rendel&eacute;s&eacute;vel kapcsolatban, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br />Az Intimix.hu csapata</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <!-- Teal line -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>

      <!-- Footer logo -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>

      <!-- Disclaimer -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Divider -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Copyright -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'delivery-today',
    name: 'Delivery Today',
    description: 'Notify customer their package is being delivered today with courier phone and time window',
    category: 'Shipping',
    subject: 'Csomagja ma érkezik - Rendelés #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  .desktop_hide, .desktop_hide table { mso-hide: all; display: none; max-height: 0px; overflow: hidden; }
  .image_block img+div { display: none; }
  sup, sub { font-size: 75%; line-height: 0; }
  @media (max-width:660px) {
    .desktop_hide table.icons-inner { display: inline-block !important; }
    .icons-inner { text-align: center; }
    .icons-inner td { margin: 0 auto; }
    .mobile_hide { display: none; }
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
    .mobile_hide { min-height: 0; max-height: 0; max-width: 0; overflow: hidden; font-size: 0px; }
    .desktop_hide, .desktop_hide table { display: table !important; max-height: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table class="nl-container" style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Csomagja &eacute;rkezik</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:28px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">Rendel&eacute;s #{{order_id}}</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>&Ouml;r&ouml;mmel &eacute;rtes&iacute;tj&uuml;k, hogy a csomagot a fut&aacute;rszolg&aacute;lat a mai napon k&eacute;zbes&iacute;ti &Ouml;nnek.</p>
            <p>K&eacute;zbes&iacute;t&ouml; telefonsz&aacute;ma: <strong>{{delivery_phone}}</strong></p>
            <p>V&aacute;rhat&oacute; &eacute;rkez&eacute;s: <strong>{{delivery_time}}</strong></p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <!-- Teal line -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>

      <!-- Footer logo -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>

      <!-- Disclaimer -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Divider -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Copyright -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'feedback-request',
    name: 'Feedback Request',
    description: 'Ask customers for feedback after delivery with a coupon incentive',
    category: 'Marketing',
    subject: 'Kíváncsiak vagyunk a véleményére 🌟',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  .desktop_hide, .desktop_hide table { mso-hide: all; display: none; max-height: 0px; overflow: hidden; }
  .image_block img+div { display: none; }
  sup, sub { font-size: 75%; line-height: 0; }
  @media (max-width:660px) {
    .desktop_hide table.icons-inner { display: inline-block !important; }
    .icons-inner { text-align: center; }
    .icons-inner td { margin: 0 auto; }
    .mobile_hide { display: none; }
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
    .mobile_hide { min-height: 0; max-height: 0; max-width: 0; overflow: hidden; font-size: 0px; }
    .desktop_hide, .desktop_hide table { display: table !important; max-height: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table class="nl-container" style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;">K&iacute;v&aacute;ncsiak vagyunk a v&eacute;lem&eacute;ny&eacute;re 🌟</p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>&Ouml;r&ouml;mmel &eacute;rtes&uuml;lt&uuml;nk r&oacute;la, hogy csomagja meg&eacute;rkezett &eacute;s sikeresen &aacute;tvette.</p>
            <p>K&ouml;sz&ouml;nj&uuml;k, hogy az Intimix.hu-t v&aacute;lasztotta! B&iacute;zunk benne, hogy a megrendelt term&eacute;kekkel el&eacute;gedett lesz, &eacute;s &ouml;r&ouml;mmel haszn&aacute;lja őket.</p>
            <p>Nagy &ouml;r&ouml;m lenne sz&aacute;munkra, ha egy gyors v&aacute;laszban visszajelezne, hogy <strong>minden rendben volt-e a csomaggal</strong>, illetve hogy <strong>hogyan tal&aacute;lt r&aacute;nk</strong> (pl. Google, Facebook, ismerős aj&aacute;nlotta stb.).</p>
            <p>✅ Ha el&eacute;gedett, k&eacute;rj&uuml;k, v&aacute;laszoljon erre az emailre egy r&ouml;vid &uuml;zenettel, p&eacute;ld&aacute;ul:<br />&bdquo;Minden rendben volt, a term&eacute;kekkel el&eacute;gedett vagyok, &eacute;s a Google-ben tal&aacute;ltam &Ouml;n&ouml;kre.&rdquo;</p>
            <p>🎁 A rendszer automatikusan feldolgozza a v&aacute;lasz&aacute;t, &eacute;s <strong>7% kedvezm&eacute;nyre jogos&iacute;t&oacute; kuponk&oacute;dot</strong> k&uuml;ld &Ouml;nnek a k&ouml;vetkező v&aacute;s&aacute;rl&aacute;shoz.</p>
            <p>K&ouml;sz&ouml;nj&uuml;k, hogy v&aacute;s&aacute;rl&oacute;nk lett &ndash; szeretettel v&aacute;rjuk vissza!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <!-- Teal line -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>

      <!-- Footer logo -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>

      <!-- Disclaimer -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Divider -->
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Copyright -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'custom',
    name: 'Custom Email',
    description: 'Write a fully custom email from scratch',
    category: 'Custom',
    subject: '',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  @media (max-width:660px) {
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table style="background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>&Iacute;rja ide az &uuml;zenet&eacute;t...</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  },
  {
    id: 'refund',
    name: 'Refund Confirmation',
    description: 'Confirm a refund has been processed',
    category: 'Orders',
    subject: 'Visszatérítés feldolgozva - #{{order_id}}',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  p { line-height: inherit; }
  @media (max-width:660px) {
    .row-content { width: 100% !important; }
    .stack .column { width: 100%; display: block; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f9;font-family:Verdana,Geneva,sans-serif;font-size:10pt;">
<table style="background-color:#f8f8f9;" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr><td>
  <!-- Teal top bar -->
  <table style="background-color:#1aa19c;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#1aa19c;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Logo -->
  <table style="background-color:#fff;" border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:25px;padding-top:22px;width:100%;">
          <div align="center"><div style="max-width:500px;">
            <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
          </div></div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f8f8f9;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="padding-bottom:5px;padding-top:5px;" width="100%">
      <div>&nbsp;</div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Main content -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-top:50px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>

      <!-- Heading -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:30px;line-height:1.2;text-align:center;">
            <p style="margin:0;"><span style="color:#2b303a;"><strong>Visszat&eacute;r&iacute;t&eacute;s</strong></span></p>
            <p style="margin:0;"><span style="color:#2d3748;font-size:28px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:400;">Rendel&eacute;s #{{order_id}}</span></p>
          </div>
        </td>
      </tr></tbody></table>

      <!-- Body text -->
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:10px 40px;">
          <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:15px;line-height:1.5;text-align:center;">
            <p style="margin:0;">Kedves <strong>{{name}}</strong>!</p>
            <p>Ez&uacute;ton &eacute;rtes&iacute;tj&uuml;k, hogy a visszat&eacute;r&iacute;t&eacute;s&eacute;t feldolgoztuk.</p>
            <p>Az &ouml;sszeg 3-5 munkanapon bel&uuml;l visszaker&uuml;l a banksz&aacute;ml&aacute;j&aacute;ra.</p>
            <p>Ha b&aacute;rmilyen k&eacute;rd&eacute;se lenne, forduljon hozz&aacute;nk bizalommal!</p>
            <p>&Uuml;dv&ouml;zlettel:<br /><strong>Az Intimix.hu csapata</strong></p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Contact info -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#f3fafa;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td style="border-left:30px solid #fff;border-right:30px solid #fff;padding:15px 10px;" width="100%">
      <div style="color:#555;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:13px;line-height:1.6;">
        &Uuml;gyf&eacute;lszolg&aacute;lat el&eacute;rhetős&eacute;ge:<br />
        Email: <a href="mailto:info@intimix.hu" style="color:#1aa19c;">info@intimix.hu</a><br />
        Telefon: +36 (21) 202-57-07
      </div>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Spacer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#fff;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding-bottom:12px;padding-top:60px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:0px solid #BBBBBB;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

  <!-- Footer -->
  <table border="0" width="100%" cellspacing="0" cellpadding="0" align="center">
  <tbody><tr><td>
    <table style="background-color:#2b303a;color:#000;width:640px;margin:0 auto;" border="0" width="640" cellspacing="0" cellpadding="0" align="center">
    <tbody><tr><td width="100%">
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td>
        <div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:4px solid #1AA19C;">&nbsp;</td>
        </tr></tbody></table></div>
      </td></tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="width:100%;"><div align="center"><div style="max-width:500px;">
          <img style="display:block;height:auto;border:0;width:100%;" src="cid:intimix-logo-png" alt="Intimix" width="500" height="auto" />
        </div></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:15px 40px 10px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.5;">
            <p style="margin:0;">Ez egy automatikus e-mail. Az IntimiX webshop egy a TM Infotech Kft &aacute;ltal &uuml;zemeltetett webshop.</p>
          </div>
        </td>
      </tr></tbody></table>
      <table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:25px 40px 10px;"><div align="center"><table border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
          <td style="font-size:1px;line-height:1px;border-top:1px solid #555961;">&nbsp;</td>
        </tr></tbody></table></div></td>
      </tr></tbody></table>
      <table style="word-break:break-word;" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
        <td style="padding:20px 40px 30px;">
          <div style="color:#95979c;font-family:Montserrat,Trebuchet MS,Lucida Grande,sans-serif;font-size:12px;line-height:1.2;">
            <p style="margin:0;">IntimiX - TM Infotech Kft @2026</p>
          </div>
        </td>
      </tr></tbody></table>
    </td></tr></tbody></table>
  </td></tr></tbody></table>

</td></tr>
</tbody>
</table>
</body>
</html>`
  }
]
