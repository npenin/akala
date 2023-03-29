param ([Parameter(Position=0)][String] $name,
       [Parameter(Position=1)][String] $binPath)

Convert-FromJson | new-service -Name $name
   -BinaryPathName $binPath
   [-DisplayName <String>]
   [-Description <String>]
   [-SecurityDescriptorSddl <String>]
   [-StartupType <ServiceStartupType>]
   [-Credential <PSCredential>]
   [-DependsOn <String[]>]
   [-WhatIf]
   [-Confirm]