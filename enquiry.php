<?

include "rmail.php";

$mail="info@omshricharitabletrust.org";



$msg="*********************************************************************\n\t\t( WEBSITE QUERY) \n*********************************************************************\n\n\nName :- ".$_POST['txtname']."\nOrganization :- ".$_POST['txtorg']."\nAddress :- ".$_POST['txtaddress']."\nPhone :- ".$_POST['txtphone']."\nMobile :".$_POST['txtmobile']."\nEmail :- ".$_POST['txtemail']."\nEnquiry :- ".$_POST['txtenquiry']."";



//echo $msg;

	$m= new TMail; 

	$m->From($_POST['txtemail']);

	$m->To($mail);

	$m->Subject("Query From Website");

	$m->Body($msg);

	$m->Bcc("weblineservices@yahoo.co.in");

	$m->Priority(4);

	$m->Send();	

   include("thankyou.html");

?>


