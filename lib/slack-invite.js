import request from 'superagent';

export default function invite({
  org, token, email, channel, logger,
}, fn) {
  const data = { email, token };

  if (channel) {
    if(channel.length){
      data.channels = channel.join()
    }
    else {
      data.channels = channel;
    }
    data.set_active = true;
  }

  request
    .post(`https://${org}.slack.com/api/users.admin.invite`)
    .type('form')
    .send(data)
    .end((err, res) => {
      if (err) return fn(err);
      if (res.status !== 200) {
        return fn(new Error(`Invalid response ${res.status}.`));
      }

      // If the account that owns the token is not admin, Slack will oddly
      // return `200 OK`, and provide other information in the body. So we
      // need to check for the correct account scope and call the callback
      // with an error if it's not high enough.
      const { ok, error: providedError, needed } = res.body;
      if (!ok) {
        if (logger) logger(`Error sending an invite to ${email}: ${providedError}`);
        if (providedError === 'missing_scope' && needed === 'admin') {
          return fn(new Error('Missing admin scope: The token you provided is for an account that is not an admin. You must provide a token from an admin account in order to invite users through the Slack API.'));
        } else if (providedError === 'already_invited') {
          return fn(new Error('You have already been invited to Slack. Check for an email from feedback@slack.com.'));
        } else if (providedError === 'already_in_team') {
          return fn(new Error('Sending you to Slack...'));
        }
        return fn(new Error(providedError));
      }
      if (logger) logger(`Sent an invite to ${email}`);
      return fn(null);
    });
}
