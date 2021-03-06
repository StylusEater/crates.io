import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { module, test } from 'qunit';

import { Response } from 'ember-cli-mirage';
import window from 'ember-window-mock';
import { setupWindowMock } from 'ember-window-mock/test-support';

import setupMirage from '../helpers/setup-mirage';

module('Route | github-authorized', function (hooks) {
  setupApplicationTest(hooks);
  setupWindowMock(hooks);
  setupMirage(hooks);

  test('happy path', async function (assert) {
    assert.expect(5);

    window.close = () => assert.step('window.close()');

    let message = null;
    window.opener = {
      postMessage(_message) {
        assert.step('window.opener.postMessage()');
        message = _message;
      },
    };

    this.server.get('/api/private/session/authorize', (schema, request) => {
      assert.deepEqual(request.queryParams, {
        code: '901dd10e07c7e9fa1cd5',
        state: 'fYcUY3FMdUUz00FC7vLT7A',
      });

      return {
        user: {
          id: 42,
          login: 'johnnydee',
          email_verified: true,
          email_verification_sent: true,
          name: 'John Doe',
          email: 'john@doe.com',
          avatar: 'https://avatars2.githubusercontent.com/u/1234567?v=4',
          url: 'https://github.com/johnnydee',
        },
      };
    });

    await visit('/authorize/github?code=901dd10e07c7e9fa1cd5&state=fYcUY3FMdUUz00FC7vLT7A');

    assert.deepEqual(message, {
      data: {
        user: {
          id: 42,
          avatar: 'https://avatars2.githubusercontent.com/u/1234567?v=4',
          email: 'john@doe.com',
          email_verification_sent: true,
          email_verified: true,
          login: 'johnnydee',
          name: 'John Doe',
          url: 'https://github.com/johnnydee',
        },
      },
      ok: true,
    });

    assert.verifySteps(['window.opener.postMessage()', 'window.close()']);
  });

  test('sad path', async function (assert) {
    assert.expect(4);

    window.close = () => assert.step('window.close()');
    let message = null;
    window.opener = {
      postMessage(_message) {
        assert.step('window.opener.postMessage()');
        message = _message;
      },
    };

    this.server.get('/api/private/session/authorize', () => new Response(500));

    await visit('/authorize/github?code=901dd10e07c7e9fa1cd5&state=fYcUY3FMdUUz00FC7vLT7A');

    assert.strictEqual(message.ok, false);
    assert.verifySteps(['window.opener.postMessage()', 'window.close()']);
  });
});
