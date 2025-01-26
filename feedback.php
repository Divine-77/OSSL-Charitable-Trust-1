<?

include "rmail.php";

$mail="";



$msg="*********************************************************************\n\t\t( WEBSITE QUERY) \n*********************************************************************\n\n\nName :- ".$_POST['txtname']."\nOrganization :- ".$_POST['txtorganisation']."\nAddress :- ".$_POST['txtaddress']."\nPhone :- ".$_POST['txtphone']."\nFax :".$_POST['txtfax']."\nEmail :- ".$_POST['txtemail']."\nSuggestion :- ".$_POST['txtsuggestion']."";



//echo $msg;

	$m= new TMail; 

	$m->From($_POST['txtemail']);

	$m->To($mail);

	$m->Subject("Query From Website");

	$m->Body($msg);

	$m->Bcc("webmaster@weblineinfosoft.com, weblineservices@yahoo.co.in");

	$m->Priority(4);

	$m->Send();	

   include("thankyou.html");

?>


