import {
  AuthTokenDetails,
  MediaContent,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { BotsabDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/botsab.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

type BotsabCredentials = {
  url: string;
  apiKey: string;
  instanceId: string;
};

type BotsabTarget = {
  jid: string;
  releaseURL: string;
};

export class BotsabProvider extends SocialAbstract implements SocialProvider {
  identifier = 'botsab';
  name = 'Botsab';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  dto = BotsabDto;

  maxLength() {
    return 4096;
  }

  private credentials(integration: Integration): BotsabCredentials {
    return JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );
  }

  async customFields() {
    return [
      {
        key: 'url',
        label: 'Botsab URL',
        defaultValue: '',
        validation: `/^(https?:\\/\\/)(?:\\S+(?::\\S*)?@)?(?:(?:localhost)|(?:\\d{1,3}(?:\\.\\d{1,3}){3})|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63})(?::\\d{2,5})?(?:\\/[^\\s?#]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'instanceId',
        label: 'Instance ID',
        validation: `/^.+$/`,
        type: 'text' as const,
        hint: 'The instance id from your Botsab dashboard - it must already be paired with WhatsApp there',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        validation: `/^.+$/`,
        type: 'password' as const,
      },
    ];
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body: BotsabCredentials = JSON.parse(
      Buffer.from(params.code, 'base64').toString()
    );
    const url = body.url.replace(/\/$/, '');

    try {
      const instances = await (
        await this.fetch(`${url}/instances`, {
          headers: { 'x-api-key': body.apiKey },
        })
      ).json();

      const instance = instances.find(
        (current: any) => current.id === body.instanceId
      );

      if (!instance) {
        return 'Instance not found for this API key';
      }

      if (instance.status !== 'connected') {
        return 'This instance is not connected yet - pair it with WhatsApp in Botsab first';
      }

      return {
        id: instance.id,
        name: instance.phoneNumber || instance.slug,
        accessToken: body.apiKey,
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        picture: '',
        username: instance.phoneNumber || instance.slug,
      };
    } catch (e) {
      return 'Could not connect to Botsab with the given URL and API key';
    }
  }

  @Tool({ description: 'WhatsApp groups for this instance', dataSchema: [] })
  async groups(
    accessToken: string,
    params: any,
    id: string,
    integration: Integration
  ) {
    const body = this.credentials(integration);
    const url = body.url.replace(/\/$/, '');

    const groups = await (
      await this.fetch(`${url}/instances/${body.instanceId}/groups`, {
        headers: { 'x-api-key': body.apiKey },
      })
    ).json();

    return groups.map((group: any) => ({ id: group.id, name: group.name }));
  }

  private messageBody(media: MediaContent | undefined, message: string) {
    if (!media) {
      return { type: 'text' as const, text: message };
    }

    if (media.type === 'video') {
      return { type: 'video' as const, url: media.path, caption: message };
    }

    return { type: 'image' as const, url: media.path, caption: message };
  }

  private targets(settings: BotsabDto): BotsabTarget[] {
    const groupTargets: BotsabTarget[] = (settings.groups || []).map(
      (groupId) => ({ jid: groupId, releaseURL: '' })
    );

    const peopleTargets: BotsabTarget[] = (settings.people || '')
      .split(',')
      .map((phone) => phone.replace(/[^0-9]/g, ''))
      .filter(Boolean)
      .map((phone) => ({
        jid: `${phone}@s.whatsapp.net`,
        releaseURL: `https://wa.me/${phone}`,
      }));

    return [...groupTargets, ...peopleTargets];
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<BotsabDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const body = this.credentials(integration);
    const url = body.url.replace(/\/$/, '');
    const messageBody = this.messageBody(
      firstPost.media?.[0],
      firstPost.message
    );

    const targets = this.targets(firstPost.settings);
    const results: PostResponse[] = [];

    for (const [index, target] of targets.entries()) {
      const data = await (
        await this.fetch(
          `${url}/instances/${body.instanceId}/messages/send`,
          {
            method: 'POST',
            headers: {
              'x-api-key': body.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to: target.jid, ...messageBody }),
          }
        )
      ).json();

      results.push({
        id: firstPost.id,
        postId: data.messageId,
        releaseURL: target.releaseURL,
        status: 'completed',
      });

      // Sequential sends with a short delay, mirroring Botsab's own sendBulk
      // default, so a multi-target post doesn't trip WhatsApp's anti-spam bans.
      if (index < targets.length - 1) {
        await timer(1000);
      }
    }

    return results;
  }
}
