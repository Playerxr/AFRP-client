import { setServers } from '../actions/serverActions';
import { ServerService } from '../services/server.service';
import { AppThunk } from '../store/store';

export const fetchServers = (): AppThunk => async (dispatch, state) => {
  const servers = state().distribution.servers;

  if (servers.length > 0) {
    for (const server of servers) {
      // adresse = "ip:port" — le port DOIT être passé (AFRP = 24328, pas 7777)
      const [ip, portStr] = server.address.split(':');
      const port = parseInt(portStr, 10) || 7777;
      try {
        const { players, maxplayers } = await ServerService.getOnline(ip, port);
        dispatch(
          setServers({
            ...server,
            online: players,
            slot: maxplayers,
            status: true,
            loading: false,
          }),
        );
      } catch (e) {
        dispatch(
          setServers({
            ...server,
            online: 0,
            slot: 1000,
            status: false,
            loading: false,
          }),
        );
      }
    }
  }
};
