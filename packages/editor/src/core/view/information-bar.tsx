import { Box, Text } from "ink";
import React from "react";

export type Information = {
    /**
     * current mode
     */
    mode: string
}

export function InformationBar({mode}: Information) {

	return <Box width="100%" height={1} backgroundColor="blue" flexDirection='row' paddingLeft={2}>
        <Text color='white' bold>
            {mode}
        </Text>
    </Box>;
}
