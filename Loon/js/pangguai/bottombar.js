try {
  let parsedBody = JSON.parse($response.body);
  parsedBody.data.items = [];
  $done({ body: JSON.stringify(parsedBody) });

} catch (error) {
  console.log(`Error modifying response body: ${error}`);
  $done({});
}