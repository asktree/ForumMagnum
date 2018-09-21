Package.describe({
  name: "example-forum",
  summary: "Vulcan forum package",
  version: '1.11.0',
  git: "https://github.com/VulcanJS/Vulcan.git"
});

Package.onUse(function (api) {

  api.versionsFrom('METEOR@1.5.2');

  api.use([

    'promise',
    'fourseven:scss@4.5.0',

    // vulcan core
    'vulcan:core@1.11.0',

    // vulcan packages
    'vulcan:ui-bootstrap@1.11.0',
    'vulcan:voting@1.11.0',
    'vulcan:accounts@1.11.0',
    'vulcan:email@1.11.0',
    'vulcan:forms@1.11.0',
    'vulcan:newsletter@1.11.0',
    'vulcan:events@1.11.0',
    'vulcan:embed@1.11.0',
    'vulcan:admin@1.11.0',

  ]);

  api.addAssets([
    'lib/server/email/templates/common/test.handlebars',
    'lib/server/email/templates/common/wrapper.handlebars',
    'lib/server/email/templates/comments/newComment.handlebars',
    'lib/server/email/templates/comments/newReply.handlebars',
    'lib/server/email/templates/posts/newPendingPost.handlebars',
    'lib/server/email/templates/posts/newPost.handlebars',
    'lib/server/email/templates/posts/postApproved.handlebars',
    'lib/server/email/templates/users/accountApproved.handlebars',
    'lib/server/email/templates/users/newUser.handlebars',
    'lib/server/email/templates/newsletter/newsletter.handlebars',
    'lib/server/email/templates/newsletter/newsletterConfirmation.handlebars',
    'lib/server/email/templates/newsletter/postItem.handlebars',
    
  ], ['server']);

  api.mainModule("lib/server/main.js", "server");
  api.mainModule("lib/client/main.js", "client");

});