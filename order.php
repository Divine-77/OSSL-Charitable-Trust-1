<?
include "rmail.php";
$mail="info@omshricharitabletrust.org,prakash@omshricharitabletrust.org";

$msg="*********************************************************************\n\t\t( WEBSITE QUERY) \n*********************************************************************\n\n\nName :- $txtname\nOrganization :- $txtorganisation\nAddress :- $txtaddress\nPhone :- $txtphone\nFax :$txtfax\nEmail :- $txtemail\nOur product  :- $product1,$product2,$product3,$product4\nAny Information :- $txtinformation";

//echo $msg;
	$m= new TMail; 
	$m->From($txtemail);
	$m->To($mail);
	$m->Subject("Query From Website for product order");
	$m->Body($msg);
	$m->Bcc("weblineservices@yahoo.co.in");
	$m->Priority(4);
	$m->Send();	
   include("thankyou.html");
?>